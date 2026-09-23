<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/*
 * BE-134–138 / T68–T71 — the local/development demo dataset (17 §7–11, §19, §26–73).
 */

function seedDemo(): void
{
    (new ReferenceDataSeeder)->run();
    if (! User::query()->where('username', 'superadmin')->exists()) {
        Artisan::call('nscmf:bootstrap-superadmin');
    }
    app(DemoSeeder::class)->run();
}

/** @return array<string, stdClass> request_no => record row */
function demoRecords(): array
{
    $records = [];
    foreach (DB::table('nscmf_records')->where('request_no', 'like', 'DEMO-%')->get() as $record) {
        $records[is_string($record->request_no) ? $record->request_no : ''] = $record;
    }

    return $records;
}

function iterationOf(stdClass $record): ?stdClass
{
    return $record->current_workflow_iteration_id === null ? null
        : DB::table('nscmf_workflow_iterations')->where('id', $record->current_workflow_iteration_id)->sole();
}

function userId(string $username): int
{
    $id = DB::table('users')->where('username', $username)->value('id');

    return is_int($id) ? $id : throw new RuntimeException("No {$username}.");
}

it('refuses production and un-opted staging before writing a single demo row', function (string $environment): void {
    app()->detectEnvironment(fn (): string => $environment);
    $before = [DB::table('teams')->count(), DB::table('users')->count(), DB::table('nscmf_records')->count()];

    expect(fn () => app(DemoSeeder::class)->run())->toThrow(RuntimeException::class);
    expect([DB::table('teams')->count(), DB::table('users')->count(), DB::table('nscmf_records')->count()])->toBe($before);
})->with(['production', 'staging']);

it('creates the three demo Teams and the six canonical demo accounts', function (): void {
    seedDemo();

    expect(DB::table('teams')->whereIn('name', ['Demo Team Alpha', 'Demo Team Beta', 'Demo Team Gamma'])->where('is_active', true)->count())->toBe(3);
    $users = DB::table('users')->where('username', 'like', 'demo.%')->get()->keyBy('username');
    expect($users->keys()->sort()->values()->all())->toBe(['demo.approver', 'demo.disabled', 'demo.multi', 'demo.requester.a', 'demo.requester.b', 'demo.reviewer'])
        ->and($users->get('demo.disabled')?->is_active)->toBe(0)
        ->and($users->every(fn (stdClass $user): bool => $user->must_change_password === 0 && is_string($user->password) && Hash::check('password', $user->password)))->toBeTrue()
        ->and(User::query()->where('username', 'demo.multi')->sole()->getRoleNames()->sort()->values()->all())->toBe(['Approver', 'Reviewer']);
});

it('seeds the twenty coherent DEMO scenarios with every state, subtype and archive case', function (): void {
    seedDemo();
    $records = demoRecords();

    $expected = [
        'DEMO-ACT-001' => ['DRAFT', 0], 'DEMO-ACT-002' => ['PENDING_REVIEW', 0], 'DEMO-ACT-003' => ['REVISION_REQUIRED', 0],
        'DEMO-ACT-004' => ['PENDING_APPROVAL', 0], 'DEMO-ACT-005' => ['APPROVED', 0], 'DEMO-ACT-006' => ['REJECTED', 0],
        'DEMO-ACT-007' => ['CANCELLED', 0], 'DEMO-ACT-008' => ['APPROVED', 1], 'DEMO-ACT-009' => ['REVISION_REQUIRED', 0],
        'DEMO-ACT-010' => ['PENDING_REVIEW', 0], 'DEMO-CHG-001' => ['DRAFT', 0], 'DEMO-CHG-002' => ['PENDING_REVIEW', 0],
        'DEMO-CHG-003' => ['PENDING_REVIEW', 0], 'DEMO-CHG-004' => ['REVISION_REQUIRED', 0], 'DEMO-CHG-005' => ['PENDING_APPROVAL', 0],
        'DEMO-CHG-006' => ['APPROVED', 0], 'DEMO-CHG-007' => ['REJECTED', 0], 'DEMO-CHG-008' => ['CANCELLED', 1],
        'DEMO-CHG-009' => ['APPROVED', 1], 'DEMO-CHG-010' => ['PENDING_REVIEW', 0],
    ];
    expect(array_map(fn (stdClass $r): array => [$r->business_status, $r->is_archived], $records))->toEqualCanonicalizing($expected)
        ->and(DB::table('nscmf_records')->distinct()->pluck('subtype')->sort()->values()->all())
        ->toBe(['ACTIVATION', 'DEACTIVATION', 'EMERGENCY', 'MAINTENANCE', 'UPGRADE', 'UPGRADE_DOWNGRADE']);

    foreach (['DEMO-ACT-001', 'DEMO-ACT-007', 'DEMO-CHG-001', 'DEMO-CHG-008'] as $neverSubmitted) {
        expect($records[$neverSubmitted]->current_workflow_iteration_id)->toBeNull()->and($records[$neverSubmitted]->requested_by_user_id)->toBeNull();
    }

    // Cancelled + archived by the Protected Superadmin, who owns it: a never-submitted record is
    // visible to its owner only (12 §17.1), and the archive actor is the Superadmin (17 §49, §981).
    expect($records['DEMO-CHG-008']->owner_user_id)->toBe(userId('superadmin'))
        ->and($records['DEMO-CHG-008']->archived_by_user_id)->toBe(userId('superadmin'));

    // Reviewer collaboration: an earlier Return by demo.reviewer, the effective Forward by demo.multi.
    $act004 = $records['DEMO-ACT-004'];
    expect(iterationOf($act004)?->reviewed_by_user_id)->toBe(userId('demo.multi'))
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $act004->id)->where('event_type', 'REVIEW_RETURNED')->value('actor_user_id'))->toBe(userId('demo.reviewer'));

    // Reopen Approved → iteration 2 in revision; iteration 1 approved and superseded; Requested By kept.
    $act009 = $records['DEMO-ACT-009'];
    $iterations = DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $act009->id)->orderBy('iteration_no')->get();
    expect($iterations)->toHaveCount(2)
        ->and($iterations->first()?->closed_status)->toBe('APPROVED')->and($iterations->first()?->superseded_at)->not->toBeNull()
        ->and($iterations->last()?->started_via)->toBe('REOPEN')
        ->and($act009->requested_by_user_id)->toBe($iterations->first()?->started_by_user_id);
    expect(iterationOf($records['DEMO-ACT-010'])?->iteration_no)->toBe(2);

    // Approver Return Reviewer cleared the effective review; Reviewer vs Approver reject are distinct.
    expect(iterationOf($records['DEMO-CHG-010'])?->reviewed_by_user_id)->toBeNull()
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $records['DEMO-ACT-006']->id)->where('event_type', 'REVIEW_REJECTED')->count())->toBe(1)
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $records['DEMO-CHG-007']->id)->where('event_type', 'APPROVAL_REJECTED')->count())->toBe(1);

    // demo.multi reviews and approves CHG-006: no mandatory segregation of duties.
    $chg006 = iterationOf($records['DEMO-CHG-006']);
    expect($chg006?->reviewed_by_user_id)->toBe(userId('demo.multi'))->and($chg006?->approved_by_user_id)->toBe(userId('demo.multi'));
});

it('covers every reference type, service impact and Result scenario with synthetic data only', function (): void {
    seedDemo();
    $records = demoRecords();

    expect(DB::table('nscmf_activation_references')->distinct()->pluck('reference_type')->sort()->values()->all())->toBe(['IWO', 'OTHER', 'TICKET', 'VELOSHIP'])
        ->and(DB::table('nscmf_change_service_impacts')->distinct()->pluck('impact_code')->sort()->values()->all())->toBe(['CUSTOMER', 'NOC15', 'NOC23', 'NOC361', 'OTHER', 'POP', 'REGIONAL'])
        ->and(DB::table('nscmf_change_service_impacts')->where('impact_code', 'OTHER')->whereNull('other_description')->count())->toBe(0)
        ->and(DB::table('nscmf_change_results')->where('nscmf_record_id', $records['DEMO-CHG-002']->id)->count())->toBe(0)
        ->and(DB::table('nscmf_change_results')->where('nscmf_record_id', $records['DEMO-CHG-003']->id)->count())->toBeGreaterThan(0)
        ->and(DB::table('nscmf_change_results')->selectRaw('count(*) as c')->groupBy('nscmf_record_id')->pluck('c')->max())->toBeLessThanOrEqual(5)
        ->and(DB::table('nscmf_activation_details')->pluck('wan_ip')->filter()->every(fn (mixed $ip): bool => is_string($ip) && preg_match('/^(192\.0\.2|198\.51\.100|203\.0\.113)\./', $ip) === 1))->toBeTrue();

    foreach (['nscmf_attachments', 'nscmf_attachment_upload_sessions', 'nscmf_export_requests', 'nscmf_pdf_issuances', 'nscmf_template_versions', 'nscmf_number_sequences'] as $table) {
        expect(DB::table($table)->count())->toBe(0);
    }
    expect(collect($records)->pluck('team_id')->filter()->unique()->count())->toBe(2);
});

it('reruns safely: no duplicates and intentional changes are preserved', function (): void {
    seedDemo();
    DB::table('users')->where('username', 'demo.requester.a')->update(['password' => Hash::make('changed-by-operator')]);
    $draft = demoRecords()['DEMO-ACT-001'];
    DB::table('nscmf_activation_details')->where('nscmf_record_id', $draft->id)->update(['customer_name' => 'Edited by a human']);
    $counts = fn (): array => [DB::table('teams')->count(), DB::table('users')->count(), DB::table('nscmf_records')->count(), DB::table('business_audit_events')->count()];
    $before = $counts();

    app(DemoSeeder::class)->run();

    $password = DB::table('users')->where('username', 'demo.requester.a')->value('password');
    expect($counts())->toBe($before)
        ->and(is_string($password) && Hash::check('changed-by-operator', $password))->toBeTrue()
        ->and(DB::table('nscmf_activation_details')->where('nscmf_record_id', $draft->id)->value('customer_name'))->toBe('Edited by a human');
});
