<?php

declare(strict_types=1);

use App\Jobs\GenerateExport;
use App\Services\Export\ExportGenerationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\travel;

/*
 * BE-105–113 / T47–T53 — template registry, OOXML patching and asynchronous XLSX export from an
 * immutable snapshot (11 §41–46; 12 §64–71; 14 §66–70). Needs the private official workbook;
 * without it these cases skip instead of passing.
 */

function officialWorkbook(): string
{
    return base_path('NSCMF-Form-3.0.xlsx');
}

function registerTemplate(): void
{
    Artisan::call('nscmf:template:register', ['path' => officialWorkbook(), '--label' => 'NSCMF-Form-3.0', '--activate' => true]);
}

/** @return array<string, string> cell reference => text, for one worksheet of an XLSX */
function sheetCells(string $xlsx, string $sheet): array
{
    $zip = new ZipArchive;
    $zip->open($xlsx);
    $xml = (string) $zip->getFromName("xl/worksheets/{$sheet}.xml");
    $zip->close();
    preg_match_all('#<c r="([A-Z]+\d+)"[^>]*t="inlineStr"[^>]*><is><t[^>]*>(.*?)</t></is></c>#s', $xml, $matches, PREG_SET_ORDER);

    return array_column(array_map(fn (array $m): array => [$m[1], html_entity_decode($m[2])], $matches), 1, 0);
}

function zipMember(string $xlsx, string $name): string
{
    $zip = new ZipArchive;
    $zip->open($xlsx);
    $content = (string) $zip->getFromName($name);
    $zip->close();

    return $content;
}

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Queue::fake();
});

it('registers the official template privately, verifies its hash and never overwrites a version', function (): void {
    registerTemplate();
    registerTemplate();

    $version = DB::table('nscmf_template_versions')->sole();
    expect($version->template_sha256)->toBe(hash_file('sha256', officialWorkbook()))
        ->and($version->is_active)->toBe(1)
        ->and($version->mapping_version)->toBe('nscmf-form-3.0/v1')
        ->and(Storage::disk('nscmf_private')->exists($version->private_object_key))->toBeTrue()
        ->and(str_starts_with($version->private_object_key, 'templates/'))->toBeTrue();
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');

it('requests an export with an immutable snapshot, audits it and queues the worker after commit', function (): void {
    registerTemplate();
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])
        ->assertStatus(202)
        ->assertJsonPath('data.status', 'QUEUED')
        ->assertJsonPath('data.format', 'XLSX');

    $snapshot = DB::table('nscmf_export_snapshots')->sole();
    expect($snapshot->record_version)->toBe(1)
        ->and($snapshot->snapshot_sha256)->toHaveLength(64)
        ->and(DB::table('access_audit_events')->where('event_type', 'EXPORT_REQUESTED')->count())->toBe(1);
    Queue::assertPushed(GenerateExport::class);

    signIn(Actors::requester())->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->assertForbidden();
    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'DOCX'])->assertUnprocessable();
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');

it('generates the XLSX from the snapshot only, patching cells and controls and nothing else', function (): void {
    registerTemplate();
    $owner = Actors::requester(['name' => 'Rina Requester']);
    $recordId = Records::create($owner, 'CHANGE', 'EMERGENCY', ['request_no' => 'CHG-2026-001', 'request_no_normalized' => 'chg-2026-001', 'request_date' => '2026-09-22']);
    DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->update([
        'maintenance_purpose' => 'Replace optics & clean <patch>', 'rollback_scenario' => 'Restore',
        'monitoring_period_value' => 3, 'monitoring_period_unit' => 'DAY', 'announcement_timing' => 'TWO_DAYS_BEFORE_EMERGENCY',
    ]);
    DB::table('nscmf_change_service_impacts')->insert([
        ['nscmf_record_id' => $recordId, 'impact_code' => 'NOC15', 'other_description' => null],
        ['nscmf_record_id' => $recordId, 'impact_code' => 'OTHER', 'other_description' => 'East enterprise'],
    ]);
    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->assertStatus(202);

    // A later edit must not leak into the already-bound snapshot.
    DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->update(['maintenance_purpose' => 'Edited later']);
    app(ExportGenerationService::class)->generate((int) DB::table('nscmf_export_requests')->value('id'));

    $request = DB::table('nscmf_export_requests')->sole();
    $artifact = DB::table('nscmf_export_artifacts')->sole();
    expect($request->status)->toBe('READY')
        ->and($artifact->mime_type)->toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $xlsx = Storage::disk('nscmf_private')->path($artifact->private_object_key);
    expect(hash_file('sha256', $xlsx))->toBe($artifact->artifact_sha256)
        ->and(sheetCells($xlsx, 'sheet2'))->toMatchArray([
            'AQ4' => 'CHG-2026-001', 'AQ5' => '2026-09-22', 'Z14' => 'Replace optics & clean <patch>',
            'AC39' => '3 DAY', 'H40' => 'Restore', 'H30' => 'East enterprise', 'A67' => 'Rina Requester',
        ])
        ->and(zipMember($xlsx, 'xl/ctrlProps/ctrlProp18.xml'))->toContain('checked="Checked"')
        ->and(zipMember($xlsx, 'xl/ctrlProps/ctrlProp22.xml'))->toContain('checked="Checked"')
        ->and(zipMember($xlsx, 'xl/ctrlProps/ctrlProp20.xml'))->not->toContain('checked=')
        ->and(zipMember($xlsx, 'xl/workbook.xml'))->toContain('name="NSCMF - Activation" sheetId="8" state="hidden"');

    // Every member the mapping does not own is byte-identical to the official workbook.
    $untouched = ['xl/styles.xml', 'xl/sharedStrings.xml', 'xl/media/image1.png', 'xl/drawings/drawing2.xml', 'xl/worksheets/sheet1.xml', 'xl/ctrlProps/ctrlProp20.xml'];
    foreach ($untouched as $member) {
        expect(zipMember($xlsx, $member))->toBe(zipMember(officialWorkbook(), $member));
    }
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');

it('serves a READY export only to authorized actors until it expires after 168 hours', function (): void {
    registerTemplate();
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $exportId = signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->json('data.id');
    assert(is_int($exportId));

    signIn($owner)->getJson("/nscmf/exports/{$exportId}/download")->assertConflict()->assertJsonPath('code', 'EXPORT_NOT_READY');
    app(ExportGenerationService::class)->generate($exportId);

    signIn($owner)->getJson("/nscmf/exports/{$exportId}")->assertOk()
        ->assertJsonPath('data.status', 'READY')->assertJsonPath('data.signed', false)->assertJsonMissingPath('data.private_object_key');
    signIn($owner)->get("/nscmf/exports/{$exportId}/download")->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    signIn(Actors::requester())->getJson("/nscmf/exports/{$exportId}")->assertNotFound();
    expect(DB::table('access_audit_events')->where('event_type', 'EXPORT_DOWNLOADED')->count())->toBe(1);

    travel(168)->hours();
    travel(1)->seconds();
    signIn($owner)->getJson("/nscmf/exports/{$exportId}/download")->assertStatus(410)->assertJsonPath('code', 'EXPORT_EXPIRED');
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');

it('refuses to export without an active, hash-verified template', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->assertConflict()->assertJsonPath('code', 'EXPORT_NOT_READY');

    registerTemplate();
    Storage::disk('nscmf_private')->put((string) DB::table('nscmf_template_versions')->value('private_object_key'), 'tampered');
    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->assertConflict()->assertJsonPath('code', 'EXPORT_NOT_READY');
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');

it('creates one independently authorized request per record in a bulk export', function (): void {
    registerTemplate();
    $owner = Actors::requester();
    $mine = Records::create($owner);
    $othersDraft = Records::create(Actors::requester());

    $batch = signIn($owner)->postJson('/nscmf/exports/bulk', ['format' => 'XLSX', 'record_ids' => [$mine, $othersDraft]])
        ->assertStatus(202)
        ->assertJsonPath('data.items.0.record_id', $mine)
        ->assertJsonPath('data.items.0.status', 'QUEUED')
        ->assertJsonPath('data.items.1.record_id', $othersDraft)
        ->assertJsonPath('data.items.1.error.code', 'RESOURCE_NOT_FOUND');

    $batchId = $batch->json('data.id');
    assert(is_int($batchId));
    signIn($owner)->getJson("/nscmf/export-batches/{$batchId}")->assertOk()->assertJsonCount(1, 'data.exports');
    signIn(Actors::requester())->getJson("/nscmf/export-batches/{$batchId}")->assertNotFound();
})->skip(fn (): bool => ! is_file(officialWorkbook()), 'The private official workbook is not provisioned.');
