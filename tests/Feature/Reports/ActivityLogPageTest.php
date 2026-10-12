<?php

declare(strict_types=1);

use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * T82C / G26 — the Activity Log page (12 §47.2, 02 BR-RPT-002/003, 07 §34.2).
 */

/** A submitted record in $status with the given request date. */
function logRecord(User $owner, string $status = 'APPROVED', string $date = '2026-08-03', string $family = 'CHANGE', string $subtype = 'MAINTENANCE', bool $archived = false): int
{
    $id = Records::create($owner, $family, $subtype);
    Records::submitted($id, $owner, $status);
    DB::table('nscmf_records')->where('id', $id)->update(['request_date' => $date] + ($archived ? [
        'is_archived' => true, 'archived_at' => now(), 'archived_by_user_id' => $owner->id, 'archive_reason' => 'Done here.',
    ] : []));

    return $id;
}

/** @param list<int> $expected */
function listsExactly(array $expected): Closure
{
    return fn (Collection $items): bool => $items->pluck('id')->all() === $expected;
}

it('needs the History permission', function (): void {
    signIn(Actors::user(['nscmf.view', 'nscmf.export']))->get('/reports/activity-log')->assertForbidden();
    signIn(Actors::user(['nscmf.view.history']))->get('/reports/activity-log')->assertOk();
});

it('lists every submitted visible entry in log order, active and archived, and never another user\'s Draft', function (): void {
    $owner = Actors::requester();
    $viewer = Actors::requester();
    $late = logRecord($owner, 'APPROVED', '2026-08-20');
    $early = logRecord($owner, 'PENDING_REVIEW', '2026-08-02');
    $archived = logRecord($owner, 'REJECTED', '2026-08-10', archived: true);
    Records::create($owner); // another user's Draft
    Records::create($owner, overrides: ['business_status' => 'CANCELLED']);
    $ownDraft = Records::create($viewer, overrides: ['request_date' => '2026-08-05']);

    signIn($viewer)->get('/reports/activity-log')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Reports/ActivityLog', false)
            ->where('items', listsExactly([$early, $archived, $late]))
            ->where('meta.total', 3)
            ->where('query.statuses', ['PENDING_REVIEW', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED'])
            ->where('query.archived', 'all')
            ->where('max_entries', 1000));

    // Draft is never a default status, but the owner may pick it; others' Drafts stay hidden.
    signIn($viewer)->get('/reports/activity-log?statuses[]=DRAFT')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$ownDraft])));
});

it('filters by request date range, status, archive view, family, subtype and Request No', function (): void {
    $owner = Actors::requester();
    logRecord($owner, 'APPROVED', '2026-07-31');
    $approved = logRecord($owner, 'APPROVED', '2026-08-01', 'ACTIVATION', 'ACTIVATION');
    $rejected = logRecord($owner, 'REJECTED', '2026-08-15');
    $archived = logRecord($owner, 'APPROVED', '2026-08-31', archived: true);
    $september = logRecord($owner, 'APPROVED', '2026-09-01');
    $viewer = Actors::user(['nscmf.view.history']);
    $august = '/reports/activity-log?request_date_from=2026-08-01&request_date_to=2026-08-31';

    signIn($viewer)->get($august)->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$approved, $rejected, $archived])));
    signIn($viewer)->get("{$august}&statuses[]=APPROVED")->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$approved, $archived])));
    signIn($viewer)->get("{$august}&archived=active")->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$approved, $rejected])));
    signIn($viewer)->get("{$august}&archived=archived")->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$archived])));
    signIn($viewer)->get("{$august}&family=ACTIVATION&subtype=ACTIVATION")->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$approved])));

    $requestNo = NscmfRecord::query()->findOrFail($september)->request_no;
    signIn($viewer)->get('/reports/activity-log?q='.strtolower(substr($requestNo, 5)))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('items', listsExactly([$september])));
});

it('fills Customer Name and NOC Infrastructure from the form, and summarizes period and Site Location', function (): void {
    $owner = Actors::requester();
    $activation = logRecord($owner, 'APPROVED', '2026-08-03', 'ACTIVATION', 'ACTIVATION');
    DB::table('nscmf_activation_details')->where('nscmf_record_id', $activation)->update(['customer_name' => 'Demo Customer']);
    $change = logRecord($owner, 'APPROVED', '2026-08-09');
    DB::table('nscmf_change_details')->where('nscmf_record_id', $change)->update(['maintenance_purpose' => "Demo migration of subnet\nsecond line"]);
    DB::table('nscmf_change_service_impacts')->insert([
        ['nscmf_record_id' => $change, 'impact_code' => 'POP', 'other_description' => null],
        ['nscmf_record_id' => $change, 'impact_code' => 'NOC23', 'other_description' => null],
    ]);

    signIn(Actors::user(['nscmf.view.history']))->get('/reports/activity-log')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('items.0.customer_name', 'Demo Customer')
            ->where('items.0.noc_infrastructure', [])
            ->where('items.1.customer_name', 'Demo migration of subnet')
            ->where('items.1.noc_infrastructure', ['NOC23', 'POP'])
            ->where('summary.total', 2)
            ->where('summary.period_from', '2026-08-03')
            ->where('summary.period_until', '2026-08-09')
            ->where('summary.site_defaults', ['noc15' => false, 'noc23' => true]));

    signIn(Actors::user(['nscmf.view.history']))->get('/reports/activity-log?request_date_from=2026-08-01&request_date_to=2026-08-31')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('summary.period_from', '2026-08-01')
            ->where('summary.period_until', '2026-08-31'));
});

it('rejects an unknown query key, status or archive view', function (): void {
    $viewer = Actors::user(['nscmf.view.history']);

    signIn($viewer)->getJson('/reports/activity-log?owner_user_id=1')->assertUnprocessable();
    signIn($viewer)->getJson('/reports/activity-log?statuses[]=ARCHIVED')->assertUnprocessable();
    signIn($viewer)->getJson('/reports/activity-log?archived=yes')->assertUnprocessable();
    signIn($viewer)->getJson('/reports/activity-log?request_date_from=2026-08-31&request_date_to=2026-08-01')->assertUnprocessable();
});
