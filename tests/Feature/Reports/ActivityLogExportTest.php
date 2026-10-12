<?php

declare(strict_types=1);

use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Jobs\GenerateActivityLogExport;
use App\Models\User;
use App\Services\Maintenance\CleanupService;
use App\Services\Reports\ActivityLogExportGenerationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\Actors;
use Tests\Support\Records;
use Tests\Support\StandInRenderer;
use Tests\Support\SyntheticLogWorkbook;

use function Pest\Laravel\travel;

/*
 * T82D / G26 — Activity Log export: request, immutable snapshot, worker progress, polling,
 * download, retention and Access Audit (12 §47.2, 11 §44A, 02 BR-RPT-004/005).
 */

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Queue::fake();
    Artisan::call('nscmf:template:register', ['path' => SyntheticLogWorkbook::path(), '--label' => 'NSCMF-Log-1.0', '--kind' => 'activity-log', '--activate' => true]);
});

/** An Approved Change with a request date, a Maintenance Purpose and Service Impacts. */
function exportedRecord(User $owner, string $date = '2026-08-03', string $purpose = 'Demo migration', array $impacts = ['NOC15']): int
{
    $id = Records::create($owner);
    Records::submitted($id, $owner, 'APPROVED');
    DB::table('nscmf_records')->where('id', $id)->update(['request_date' => $date]);
    DB::table('nscmf_change_details')->where('nscmf_record_id', $id)->update(['maintenance_purpose' => $purpose]);
    foreach ($impacts as $code) {
        DB::table('nscmf_change_service_impacts')->insert(['nscmf_record_id' => $id, 'impact_code' => $code, 'other_description' => null]);
    }

    return $id;
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function exportBody(array $overrides = []): array
{
    return array_replace([
        'format' => 'XLSX',
        'scope' => 'FILTERED',
        'filters' => ['statuses' => ['APPROVED'], 'archived' => 'all', 'request_date_from' => '2026-08-01', 'request_date_to' => '2026-08-31'],
        'record_ids' => [],
        'site_location' => ['noc15' => true, 'noc23' => false],
        'prepared_by' => ['name' => 'Prepared Person', 'date' => '2026-08-31'],
        'acknowledged_by' => ['name' => null, 'date' => null],
    ], $overrides);
}

/** @return array<string, mixed> */
function boundSnapshot(): array
{
    $json = DB::table('nscmf_activity_log_exports')->value('snapshot_json');

    return is_string($json) ? (array) json_decode($json, true, flags: JSON_THROW_ON_ERROR) : [];
}

function requestExport(User $actor, array $body): TestResponse
{
    return signIn($actor)->postJson('/reports/activity-log/exports', $body);
}

it('needs both the History and the Export permission', function (): void {
    exportedRecord(Actors::requester());

    requestExport(Actors::user(['nscmf.view.history']), exportBody())->assertForbidden();
    requestExport(Actors::user(['nscmf.export']), exportBody())->assertForbidden();
    requestExport(Actors::user(['nscmf.view.history', 'nscmf.export']), exportBody())->assertStatus(202);
});

it('binds the matching entries and the header as an immutable snapshot, audits the request and queues the worker', function (): void {
    $owner = Actors::requester();
    $late = exportedRecord($owner, '2026-08-20', "Second migration\nmore", ['NOC23', 'POP']);
    $early = exportedRecord($owner, '2026-08-02');
    exportedRecord($owner, '2026-09-02');

    requestExport($owner, exportBody())
        ->assertStatus(202)
        ->assertJsonPath('data.status', 'QUEUED')
        ->assertJsonPath('data.stage', 'QUEUED')
        ->assertJsonPath('data.progress_percent', 0)
        ->assertJsonPath('data.entry_count', 2)
        ->assertJsonPath('data.download_url', null);

    $snapshot = boundSnapshot();
    expect($snapshot['header'])->toBe([
        'period_from' => '2026-08-01', 'period_until' => '2026-08-31',
        'site' => ['noc15' => true, 'noc23' => false],
        'prepared_by' => ['name' => 'Prepared Person', 'date' => '2026-08-31'],
        'acknowledged_by' => ['name' => null, 'date' => null],
    ])
        ->and(array_column($snapshot['entries'], 'record_id'))->toBe([$early, $late])
        ->and($snapshot['entries'][1]['customer_name'])->toBe('Second migration')
        ->and($snapshot['entries'][1]['noc_infrastructure'])->toBe(['NOC23', 'POP'])
        ->and(DB::table('nscmf_activity_log_exports')->value('snapshot_sha256'))->toHaveLength(64);

    $exportId = DB::table('nscmf_activity_log_exports')->value('id');
    expect(DB::table('access_audit_events')->where('event_type', 'ACTIVITY_LOG_EXPORT_REQUESTED')->value('activity_log_export_id'))->toBe($exportId);
    Queue::assertPushed(GenerateActivityLogExport::class);
});

it('exports only the selected visible entries and refuses an invisible one without telling why', function (): void {
    $owner = Actors::requester();
    $first = exportedRecord($owner, '2026-08-05');
    $second = exportedRecord($owner, '2026-08-01');
    exportedRecord($owner, '2026-08-03');
    $foreignDraft = Records::create(Actors::requester());

    requestExport($owner, exportBody(['scope' => 'SELECTED', 'filters' => null, 'record_ids' => [$first, $second]]))->assertStatus(202);
    $snapshot = boundSnapshot();
    expect(array_column($snapshot['entries'], 'record_id'))->toBe([$second, $first])
        ->and($snapshot['header']['period_from'])->toBe('2026-08-01')
        ->and($snapshot['header']['period_until'])->toBe('2026-08-05');

    $invisible = requestExport($owner, exportBody(['scope' => 'SELECTED', 'filters' => null, 'record_ids' => [$first, $foreignDraft]]))->assertUnprocessable()->json('errors.record_ids.0');
    $missing = requestExport($owner, exportBody(['scope' => 'SELECTED', 'filters' => null, 'record_ids' => [$first, 999999]]))->assertUnprocessable()->json('errors.record_ids.0');
    expect($invisible)->toBe($missing);
});

it('refuses an empty export, an export above 1,000 entries and a malformed body', function (): void {
    $owner = Actors::requester();

    requestExport($owner, exportBody())->assertUnprocessable()->assertJsonPath('code', 'REPORT_EMPTY');
    requestExport($owner, exportBody(['scope' => 'SELECTED', 'filters' => null, 'record_ids' => range(1, 1001)]))->assertUnprocessable();
    requestExport($owner, exportBody(['format' => 'CSV']))->assertUnprocessable();
    requestExport($owner, exportBody(['prepared_by' => ['name' => '', 'date' => '2026-08-31']]))->assertUnprocessable();
    requestExport($owner, [...exportBody(), 'owner_user_id' => 1])->assertUnprocessable();

    $now = now();
    $rows = array_map(fn (int $n): array => [
        'request_no' => "LOAD-{$n}", 'request_no_normalized' => "load-{$n}", 'numbering_mode' => 'MANUAL', 'family' => 'CHANGE', 'subtype' => 'MAINTENANCE',
        'request_date' => '2026-08-10', 'owner_user_id' => $owner->id, 'team_id' => $owner->team_id, 'business_status' => 'APPROVED',
        'record_version' => 1, 'is_archived' => false, 'created_at' => $now, 'updated_at' => $now,
    ], range(1, 1001));
    foreach (array_chunk($rows, 250) as $chunk) {
        DB::table('nscmf_records')->insert($chunk);
    }
    requestExport($owner, exportBody())->assertUnprocessable()->assertJsonPath('code', 'REPORT_TOO_LARGE');
    expect(DB::table('nscmf_activity_log_exports')->count())->toBe(0);
});

it('refuses without an active log template and refuses a PDF while no renderer is available', function (): void {
    $owner = Actors::requester();
    exportedRecord($owner);
    app()->instance(SpreadsheetRenderer::class, new class implements SpreadsheetRenderer
    {
        public function isAvailable(): bool
        {
            return false;
        }

        public function render(string $xlsxPath, string $workspace, array $skipPages = [0, 0]): string
        {
            throw new LogicException('Not available.');
        }
    });

    requestExport($owner, exportBody(['format' => 'PDF']))->assertStatus(409)->assertJsonPath('code', 'EXPORT_NOT_READY');

    DB::table('nscmf_template_versions')->update(['is_active' => false]);
    requestExport($owner, exportBody())->assertStatus(409)->assertJsonPath('code', 'EXPORT_NOT_READY');
});

it('builds the XLSX from the snapshot only, reports 100 % and serves it to its requester', function (): void {
    $owner = Actors::requester();
    $recordId = exportedRecord($owner, '2026-08-03', 'Demo migration before edit');
    $exportId = requestExport($owner, exportBody())->json('data.id');
    DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->update(['maintenance_purpose' => 'Edited after the request']);

    app(ActivityLogExportGenerationService::class)->generate($exportId);

    signIn($owner)->getJson("/reports/activity-log/exports/{$exportId}")
        ->assertOk()
        ->assertJsonPath('data.status', 'READY')
        ->assertJsonPath('data.stage', 'READY')
        ->assertJsonPath('data.progress_percent', 100)
        ->assertJsonPath('data.download_url', "/reports/activity-log/exports/{$exportId}/download");

    $download = signIn($owner)->get("/reports/activity-log/exports/{$exportId}/download")->assertOk();
    expect($download->headers->get('content-disposition'))->toContain('nscmf-activity-log-2026-08-01-2026-08-31.xlsx')
        ->and($download->headers->get('cache-control'))->toContain('no-store');
    $path = tempnam(sys_get_temp_dir(), 'dl').'.xlsx';
    file_put_contents($path, $download->streamedContent());
    $zip = new ZipArchive;
    $zip->open($path);
    $sheet = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
    expect($sheet)->toContain('Demo migration before edit')
        ->and($sheet)->not->toContain('Edited after the request')
        ->and(DB::table('access_audit_events')->where('event_type', 'ACTIVITY_LOG_EXPORT_DOWNLOADED')->value('activity_log_export_id'))->toBe($exportId);

    $stranger = Actors::user(['nscmf.view.history', 'nscmf.export']);
    signIn($stranger)->getJson("/reports/activity-log/exports/{$exportId}")->assertNotFound();
    signIn($stranger)->get("/reports/activity-log/exports/{$exportId}/download")->assertNotFound();
});

it('shows the rendering stage while the PDF is being rendered', function (): void {
    $owner = Actors::requester();
    exportedRecord($owner);
    app()->instance(SpreadsheetRenderer::class, new StandInRenderer);
    $exportId = requestExport($owner, exportBody(['format' => 'PDF']))->json('data.id');

    /** @var ArrayObject<string, mixed> $seen */
    $seen = new ArrayObject;
    app()->instance(SpreadsheetRenderer::class, new class($seen, $owner, $exportId) implements SpreadsheetRenderer
    {
        /** @param ArrayObject<string, mixed> $seen */
        public function __construct(private ArrayObject $seen, private User $owner, private int $exportId) {}

        public function isAvailable(): bool
        {
            return true;
        }

        public function render(string $xlsxPath, string $workspace, array $skipPages = [0, 0]): string
        {
            // What the polling page sees while the renderer runs.
            $this->seen['poll'] = signIn($this->owner)->getJson("/reports/activity-log/exports/{$this->exportId}")->json('data');

            return (new StandInRenderer)->render($xlsxPath, $workspace, $skipPages);
        }
    });
    app(ActivityLogExportGenerationService::class)->generate($exportId);

    expect($seen['poll'])->toMatchArray(['status' => 'PROCESSING', 'stage' => 'RENDERING', 'progress_percent' => 70])
        ->and(DB::table('nscmf_activity_log_exports')->value('mime_type'))->toBe('application/pdf')
        ->and(DB::table('nscmf_activity_log_exports')->value('progress_percent'))->toBe(100);
});

it('lists the actor\'s own recent exports and expires their files after 168 hours', function (): void {
    $owner = Actors::requester();
    exportedRecord($owner);
    $exportId = requestExport($owner, exportBody())->json('data.id');
    requestExport(Actors::requester(), exportBody())->assertStatus(202);
    app(ActivityLogExportGenerationService::class)->generate($exportId);

    signIn($owner)->getJson('/reports/activity-log/exports')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $exportId);

    travel(169)->hours();
    app(CleanupService::class)->exports();

    $key = DB::table('nscmf_activity_log_exports')->where('id', $exportId)->value('private_object_key');
    expect(DB::table('nscmf_activity_log_exports')->where('id', $exportId)->value('status'))->toBe('EXPIRED')
        ->and(DB::table('nscmf_activity_log_exports')->where('id', $exportId)->value('binary_purged_at'))->not->toBeNull()
        ->and(is_string($key) && Storage::disk('nscmf_private')->exists($key))->toBeFalse();
    signIn($owner)->get("/reports/activity-log/exports/{$exportId}/download")->assertStatus(410);
    signIn($owner)->getJson('/reports/activity-log/exports')->assertJsonCount(0, 'data');
});

it('fails safely when the snapshot no longer matches its hash or the job runs out of attempts', function (): void {
    $owner = Actors::requester();
    exportedRecord($owner);
    $tampered = requestExport($owner, exportBody())->json('data.id');
    DB::table('nscmf_activity_log_exports')->where('id', $tampered)->update(['snapshot_json' => '{"header":{},"entries":[]}']);
    app(ActivityLogExportGenerationService::class)->generate($tampered);

    $abandoned = requestExport($owner, exportBody())->json('data.id');
    (new GenerateActivityLogExport($abandoned))->failed(new RuntimeException('Worker died.'));

    expect(DB::table('nscmf_activity_log_exports')->where('id', $tampered)->value('failure_code'))->toBe('REPORT_SNAPSHOT_INTEGRITY')
        ->and(DB::table('nscmf_activity_log_exports')->where('id', $abandoned)->value('status'))->toBe('FAILED');
    signIn($owner)->getJson("/reports/activity-log/exports/{$tampered}")->assertJsonPath('data.stage', 'FAILED');
});
