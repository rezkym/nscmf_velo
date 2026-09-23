<?php

declare(strict_types=1);

use App\Domain\Attachment\ScanVerdict;
use App\Infrastructure\Malware\MalwareScanner;
use App\Infrastructure\Pdf\PdfSigner;
use App\Services\Export\ExportGenerationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\Actors;
use Tests\Support\FakeScanner;
use Tests\Support\Records;

/*
 * BE-114–124 / T54–T61 — qualified renderer, Organization signing, issuance evidence and the
 * public validator (10 §signing; 11 §47–48; 12 §68, §72–75; 20 §19–21). Runs the real
 * LibreOffice renderer and real OpenSSL signing; skips when either is not provisioned.
 */

/** LibreOffice from the PATH (Homebrew, apt, …); empty when not installed. */
function soffice(): string
{
    return trim((string) shell_exec('command -v soffice 2>/dev/null'));
}

function signingReady(): bool
{
    return is_file(base_path('NSCMF-Form-3.0.xlsx')) && soffice() !== '';
}

function activateSigner(string $label = 'NSCMF Organization Test'): void
{
    Artisan::call('nscmf:signing:activate', ['--generate' => true, '--label' => $label]);
}

/**
 * Exports an Approved Change as PDF through the real pipeline.
 *
 * @return array{int, string} record id and PDF bytes
 */
function approvedPdf(): array
{
    $owner = Actors::requester(['name' => 'Private Requester Name']);
    $recordId = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['request_no' => 'CHG-SIGNED-1', 'request_no_normalized' => 'chg-signed-1']);
    Records::closed($recordId, $owner, Actors::approver());
    $exportId = signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'PDF'])->assertStatus(202)->json('data.id');
    assert(is_int($exportId));
    app(ExportGenerationService::class)->generate($exportId);
    $key = DB::table('nscmf_export_artifacts')->where('export_request_id', $exportId)->value('private_object_key');
    assert(is_string($key));

    return [$recordId, (string) Storage::disk('nscmf_private')->get($key)];
}

/** @return TestResponse<Response> */
function verifyPdf(string $bytes, string $name = 'nscmf.pdf'): TestResponse
{
    return asGuest()->post('/ispdfvalid/verify', ['file' => UploadedFile::fake()->createWithContent($name, $bytes)], ['Accept' => 'application/json']);
}

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Storage::fake('nscmf_runtime_tmp');
    Queue::fake();
    app()->instance(MalwareScanner::class, new FakeScanner);
    config([
        'nscmf.renderer.executable' => soffice(),
        'nscmf.signing.p12_path' => storage_path('framework/testing/signing-'.getmypid().'.p12'),
        'nscmf.signing.p12_passphrase' => 'test-only-passphrase',
    ]);
    Artisan::call('nscmf:template:register', ['path' => base_path('NSCMF-Form-3.0.xlsx'), '--activate' => true]);
});

afterEach(fn () => @unlink(storage_path('framework/testing/signing-'.getmypid().'.p12')));

it('signs an Approved PDF with the Organization certificate and records immutable issuance evidence', function (): void {
    activateSigner();
    [$recordId, $pdf] = approvedPdf();

    $issuance = DB::table('nscmf_pdf_issuances')->sole();
    expect(str_starts_with($pdf, '%PDF'))->toBeTrue()
        ->and($pdf)->toContain('/ByteRange')->toContain('adbe.pkcs7.detached')
        ->and($issuance->final_pdf_sha256)->toBe(hash('sha256', $pdf))
        ->and($issuance->nscmf_record_id)->toBe($recordId)
        ->and(DB::table('nscmf_export_requests')->value('status'))->toBe('READY');

    $exportId = DB::table('nscmf_export_requests')->value('id');
    assert(is_int($exportId));
    signIn(Actors::requester())->getJson("/nscmf/exports/{$exportId}")->assertNotFound();
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('verifies a genuine current PDF publicly with minimum disclosure, then as superseded after Reopen', function (): void {
    activateSigner();
    [$recordId, $pdf] = approvedPdf();

    verifyPdf($pdf)->assertOk()
        ->assertJsonPath('data.result', 'VALID_CURRENT')
        ->assertJsonPath('data.request_no', 'CHG-SIGNED-1')
        ->assertJsonPath('data.family', 'CHANGE')
        ->assertJsonPath('data.issuer', 'NSCMF Organization')
        ->assertJsonMissingPath('data.requested_by')
        ->assertDontSee('Private Requester Name');

    signIn(Actors::user(['nscmf.reopen', 'nscmf.view']))->post("/nscmf/{$recordId}/reopen", [
        'record_version' => Records::version($recordId), 'reason' => 'Needs another look.', 'destination_status' => 'REVISION_REQUIRED',
    ])->assertStatus(303);

    verifyPdf($pdf)->assertOk()->assertJsonPath('data.result', 'VALID_SUPERSEDED');
    expect(Storage::disk('nscmf_runtime_tmp')->allFiles())->toBe([]);
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('reports a modified signed PDF as INVALID_MODIFIED and an unknown PDF as UNKNOWN, disclosing nothing', function (): void {
    activateSigner();
    [, $pdf] = approvedPdf();

    verifyPdf($pdf."\n% appended after signing\n")->assertOk()->assertJsonPath('data.result', 'INVALID_MODIFIED')->assertJsonMissingPath('data.request_no');
    $signedByte = (int) strpos($pdf, '/Type');
    verifyPdf(substr_replace($pdf, '/TYPE', $signedByte, 5))->assertOk()->assertJsonPath('data.result', 'INVALID_MODIFIED');
    verifyPdf("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n")->assertOk()->assertJsonPath('data.result', 'UNKNOWN');
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('keeps verifying PDFs signed by a retired certificate after rotation', function (): void {
    activateSigner('Organization 2026');
    [, $pdf] = approvedPdf();
    activateSigner('Organization 2027');

    expect(DB::table('nscmf_signing_certificates')->whereNotNull('retired_at')->count())->toBe(1);
    verifyPdf($pdf)->assertOk()->assertJsonPath('data.result', 'VALID_CURRENT');
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('never produces an unsigned Approved PDF: signing unavailable refuses or fails the export', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, Actors::approver());

    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'PDF'])->assertConflict()->assertJsonPath('code', 'SIGNING_NOT_READY');

    activateSigner();
    $exportId = signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'PDF'])->json('data.id');
    assert(is_int($exportId));
    config(['nscmf.signing.p12_passphrase' => 'wrong-passphrase']);
    app()->forgetInstance(PdfSigner::class);
    app()->forgetInstance(ExportGenerationService::class);
    app(ExportGenerationService::class)->generate($exportId);

    expect(DB::table('nscmf_export_requests')->where('id', $exportId)->value('status'))->toBe('FAILED')
        ->and(DB::table('nscmf_export_requests')->where('id', $exportId)->value('failure_code'))->toBe('SIGNING_FAILED')
        ->and(DB::table('nscmf_export_artifacts')->count())->toBe(0)
        ->and(DB::table('nscmf_pdf_issuances')->count())->toBe(0)
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('APPROVED')
        ->and(DB::table('security_audit_events')->where('event_type', 'PDF_SIGNING_FAILED')->count())->toBe(1);
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('renders a non-Approved PDF unsigned and without issuance', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $exportId = signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'PDF'])->assertStatus(202)->json('data.id');
    assert(is_int($exportId));
    app(ExportGenerationService::class)->generate($exportId);

    signIn($owner)->getJson("/nscmf/exports/{$exportId}")->assertJsonPath('data.status', 'READY')->assertJsonPath('data.signed', false);
    expect(DB::table('nscmf_pdf_issuances')->count())->toBe(0);
})->skip(fn (): bool => ! signingReady(), 'LibreOffice or the official workbook is not provisioned.');

it('hardens the public validator input, scan and rate limit', function (): void {
    config(['security.pdf_validator_throttle.per_minute' => 5]);

    asGuest()->get('/ispdfvalid')->assertOk();
    verifyPdf('')->assertUnprocessable();
    verifyPdf(str_repeat('a', 100), 'notes.txt')->assertUnprocessable()->assertJsonPath('code', 'VALIDATOR_FILE_INVALID');
    asGuest()->post('/ispdfvalid/verify', ['file' => UploadedFile::fake()->create('big.pdf', 19_532)], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonPath('code', 'VALIDATOR_FILE_TOO_LARGE');

    app()->instance(MalwareScanner::class, new FakeScanner(null));
    verifyPdf("%PDF-1.4\n%%EOF\n")->assertStatus(503)->assertJsonPath('code', 'VALIDATOR_SCAN_FAILED');
    app()->instance(MalwareScanner::class, new FakeScanner(ScanVerdict::INFECTED));
    verifyPdf("%PDF-1.4\n%%EOF\n")->assertUnprocessable()->assertJsonPath('code', 'VALIDATOR_FILE_INVALID');
    verifyPdf("%PDF-1.4\n%%EOF\n")->assertStatus(429)->assertJsonPath('code', 'RATE_LIMITED');

    expect(Storage::disk('nscmf_runtime_tmp')->allFiles())->toBe([]);
});

it('exposes only the validator on the public ingress hostname', function (): void {
    config(['nscmf.public_host' => 'verify.example.test']);

    asGuest()->get('http://verify.example.test/ispdfvalid')->assertOk();
    foreach (['/login', '/dashboard', '/up', '/history', '/administration/users', '/nscmf/1'] as $path) {
        asGuest()->get("http://verify.example.test{$path}")->assertNotFound();
    }
    asGuest()->get('http://localhost/login')->assertOk();
});
