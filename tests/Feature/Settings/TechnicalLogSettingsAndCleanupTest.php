<?php

declare(strict_types=1);

use App\Domain\Attachment\SecurityStatus;
use App\Domain\Attachment\UploadStatus;
use App\Repositories\Contracts\Settings\SystemSettingsRepository;
use App\Services\Maintenance\CleanupService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\travelTo;

/*
 * BE-125–131 / T62–T65 — protected Technical Log setting and the scheduled cleanups
 * (12 §97–99; 14 §27, §94–100; 11A §22). Authoritative audits are never touched.
 */

it('initializes a missing singleton with the locked defaults and serves it to the Protected Superadmin', function (): void {
    DB::table('system_settings')->delete();

    reauthenticated(Actors::superadmin())->getJson('/administration/settings/technical-logs')
        ->assertOk()
        ->assertExactJson(['data' => ['automatic_cleanup_enabled' => true, 'retention_value' => 30, 'retention_unit' => 'DAY'], 'meta' => []]);

    signIn(Actors::user(['system.settings.manage']))->getJson('/administration/settings/technical-logs')
        ->assertForbidden()->assertJsonPath('code', 'SYSTEM_SETTINGS_PROTECTED');
});

it('updates the typed setting only for the re-authenticated Protected Superadmin and audits it', function (): void {
    $superadmin = Actors::superadmin();
    $body = ['automatic_cleanup_enabled' => false, 'retention_value' => 6, 'retention_unit' => 'MONTH'];

    signIn($superadmin)->patchJson('/administration/settings/technical-logs', $body)->assertForbidden()->assertJsonPath('code', 'REAUTH_REQUIRED');
    reauthenticated(Actors::user(['system.settings.manage']))->patchJson('/administration/settings/technical-logs', $body)
        ->assertForbidden()->assertJsonPath('code', 'SYSTEM_SETTINGS_PROTECTED');
    reauthenticated($superadmin)->patchJson('/administration/settings/technical-logs', [...$body, 'audit_retention_days' => 1])->assertUnprocessable();
    reauthenticated($superadmin)->patchJson('/administration/settings/technical-logs', [...$body, 'retention_value' => 0])->assertUnprocessable();
    reauthenticated($superadmin)->patchJson('/administration/settings/technical-logs', [...$body, 'retention_unit' => 'YEAR'])->assertUnprocessable();

    reauthenticated($superadmin)->patchJson('/administration/settings/technical-logs', $body)->assertOk()->assertJsonPath('data', $body);

    $row = DB::table('system_settings')->sole();
    expect($row->technical_log_auto_cleanup_enabled)->toBe(0)
        ->and($row->technical_log_retention_value)->toBe(6)
        ->and($row->technical_log_retention_unit)->toBe('MONTH')
        ->and($row->updated_by_user_id)->toBe($superadmin->id)
        ->and(DB::table('security_audit_events')->where('event_type', 'SYSTEM_SETTINGS_UPDATED')->count())->toBe(1);
});

it('cleans technical logs by calendar DAY or MONTH in Asia/Jakarta, never when OFF, never audits', function (): void {
    travelTo(CarbonImmutable::parse('2026-09-23 10:00:00', 'Asia/Jakarta'));
    Storage::fake('nscmf_logs');
    $disk = Storage::disk('nscmf_logs');
    foreach (['old.log' => '2026-08-23 09:59:00', 'edge.log' => '2026-08-23 10:01:00', 'recent.log' => '2026-09-23 08:00:00'] as $file => $time) {
        $disk->put($file, 'log');
        touch($disk->path($file), CarbonImmutable::parse($time, 'Asia/Jakarta')->getTimestamp());
    }
    DB::table('security_audit_events')->insert(['event_type' => 'LOGIN_FAILED', 'outcome' => 'FAILURE', 'occurred_at' => '2020-01-01 00:00:00']);
    app(SystemSettingsRepository::class)->current();

    DB::table('system_settings')->update(['technical_log_auto_cleanup_enabled' => false, 'technical_log_retention_value' => 1, 'technical_log_retention_unit' => 'MONTH']);
    expect(app(CleanupService::class)->technicalLogs())->toBe(0);

    DB::table('system_settings')->update(['technical_log_auto_cleanup_enabled' => true]);
    expect(app(CleanupService::class)->technicalLogs())->toBe(1)
        ->and($disk->allFiles())->toEqualCanonicalizing(['edge.log', 'recent.log'])
        ->and(DB::table('security_audit_events')->count())->toBe(1);

    DB::table('system_settings')->update(['technical_log_retention_value' => 1, 'technical_log_retention_unit' => 'DAY']);
    app(CleanupService::class)->technicalLogs();
    expect($disk->allFiles())->toBe(['recent.log']);
});

it('expires inactive uploads and abandoned quarantine files without touching records or audits', function (): void {
    Storage::fake('nscmf_private');
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $disk = Storage::disk('nscmf_private');
    $disk->put('chunks/stale', 'x');
    $disk->put('chunks/live', 'x');
    $disk->put('quarantine/abandoned', 'x');
    $session = fn (string $status, string $expires, ?string $chunk): int => (function () use ($recordId, $owner, $status, $expires, $chunk): int {
        $id = (int) DB::table('nscmf_attachment_upload_sessions')->insertGetId([
            'public_id' => strtolower((string) Str::ulid()), 'nscmf_record_id' => $recordId, 'initiated_by_user_id' => $owner->id,
            'original_filename' => 'a.txt', 'normalized_extension' => 'txt', 'expected_size_bytes' => 1, 'chunk_size_bytes' => 5_242_880,
            'expected_chunk_count' => 1, 'upload_status' => $status, 'last_activity_at' => now(), 'expires_at' => $expires,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        if ($chunk !== null) {
            DB::table('nscmf_attachment_upload_chunks')->insert(['upload_session_id' => $id, 'chunk_index' => 1, 'size_bytes' => 1, 'storage_key' => $chunk, 'chunk_sha256' => str_repeat('a', 64), 'accepted_at' => now()]);
        }

        return $id;
    })();
    $stale = $session(UploadStatus::UPLOADING->value, now()->subMinute()->toDateTimeString(), 'chunks/stale');
    $live = $session(UploadStatus::UPLOADING->value, now()->addHour()->toDateTimeString(), 'chunks/live');
    DB::table('nscmf_attachments')->insert([
        'nscmf_record_id' => $recordId, 'uploaded_by_user_id' => $owner->id, 'original_filename' => 'a.txt', 'extension' => 'txt',
        'detected_mime_type' => 'text/plain', 'size_bytes' => 1, 'sha256' => str_repeat('b', 64), 'quarantine_object_key' => 'quarantine/abandoned',
        'security_status' => SecurityStatus::PENDING->value, 'created_at' => now()->subHours(25), 'updated_at' => now()->subHours(25),
    ]);

    app(CleanupService::class)->uploads();

    expect(DB::table('nscmf_attachment_upload_sessions')->where('id', $stale)->value('upload_status'))->toBe('EXPIRED')
        ->and(DB::table('nscmf_attachment_upload_sessions')->where('id', $live)->value('upload_status'))->toBe('UPLOADING')
        ->and($disk->exists('chunks/stale'))->toBeFalse()
        ->and($disk->exists('chunks/live'))->toBeTrue()
        ->and($disk->exists('quarantine/abandoned'))->toBeFalse()
        ->and(DB::table('nscmf_attachments')->value('security_status'))->toBe('FAILED')
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('DRAFT');
});

it('purges export binaries after 168 hours while keeping issuance, snapshot and history', function (): void {
    Storage::fake('nscmf_private');
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $template = DB::table('nscmf_template_versions')->insertGetId(['version_label' => 'v', 'private_object_key' => 'templates/x.xlsx', 'template_sha256' => str_repeat('c', 64), 'mapping_version' => 'nscmf-form-3.0/v1', 'is_active' => true]);
    $artifacts = [];
    foreach (['expired' => now()->subSecond(), 'fresh' => now()->addHour()] as $name => $expiresAt) {
        $request = DB::table('nscmf_export_requests')->insertGetId(['nscmf_record_id' => $recordId, 'requested_by_user_id' => $owner->id, 'format' => 'XLSX', 'status' => 'READY', 'requested_at' => now(), 'ready_at' => now(), 'expires_at' => $expiresAt]);
        DB::table('nscmf_export_snapshots')->insert(['export_request_id' => $request, 'nscmf_record_id' => $recordId, 'record_version' => 1, 'template_version_id' => $template, 'snapshot_schema_version' => 's', 'snapshot_json' => '{}', 'snapshot_sha256' => str_repeat('d', 64), 'created_at' => now()]);
        Storage::disk('nscmf_private')->put("exports/{$name}", 'x');
        $artifacts[$name] = DB::table('nscmf_export_artifacts')->insertGetId(['export_request_id' => $request, 'private_object_key' => "exports/{$name}", 'mime_type' => 'x', 'size_bytes' => 1, 'artifact_sha256' => str_repeat('e', 64), 'created_at' => now(), 'expires_at' => $expiresAt]);
    }

    app(CleanupService::class)->exports();
    app(CleanupService::class)->exports();

    $expired = DB::table('nscmf_export_artifacts')->where('id', $artifacts['expired'])->sole();
    expect($expired->binary_purged_at)->not->toBeNull()
        ->and(Storage::disk('nscmf_private')->exists('exports/expired'))->toBeFalse()
        ->and(Storage::disk('nscmf_private')->exists('exports/fresh'))->toBeTrue()
        ->and(DB::table('nscmf_export_requests')->where('id', $expired->export_request_id)->value('status'))->toBe('EXPIRED')
        ->and(DB::table('nscmf_export_snapshots')->count())->toBe(2);
});

it('removes only runtime workspaces older than the queue retry window', function (): void {
    Storage::fake('nscmf_runtime_tmp');
    $disk = Storage::disk('nscmf_runtime_tmp');
    $disk->makeDirectory('validator/abandoned');
    $disk->makeDirectory('exports/active');
    touch($disk->path('validator/abandoned'), time() - 3600);

    app(CleanupService::class)->runtimeWorkspaces();

    expect($disk->directories('validator'))->toBe([])->and($disk->directories('exports'))->toBe(['exports/active']);
});

it('schedules every cleanup through the console kernel', function (): void {
    Artisan::call('schedule:list');
    $schedule = Artisan::output();

    foreach (['nscmf:cleanup technical-logs', 'nscmf:cleanup uploads', 'nscmf:cleanup exports', 'nscmf:cleanup runtime'] as $command) {
        expect($schedule)->toContain($command);
    }
});
