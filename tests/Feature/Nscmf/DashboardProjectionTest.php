<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\travelTo;

/*
 * BE-087 / T37 — the Dashboard projection (07 §17, 12 §23–24, §44, §100–101).
 */

it('counts the actor\'s own drafts and revisions and lists a few of each', function (): void {
    $owner = Actors::requester();
    $draftA = Records::create($owner);
    Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    $revision = Records::create($owner);
    Records::submitted($revision, $owner, 'REVISION_REQUIRED');
    $otherOwner = Actors::requester();
    Records::create($otherOwner);

    signIn($owner)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Index')
            ->where('counts.drafts.count', 2)
            ->where('counts.revisions.count', 1)
            ->missing('counts.reviews')
            ->missing('counts.approvals')
            ->has('items.drafts', 2)
            ->where('items.drafts.0.id', $draftA)
            ->has('items.drafts.0.request_no')
            ->has('items.drafts.0.team.name')
            ->where('items.revisions.0.id', $revision));
});

/**
 * @param  list<string>  $permissions
 */
function actorWith(array $permissions): User
{
    return Actors::member($permissions);
}

it('shows the shared pools only to actors who hold their permission', function (): void {
    $owner = Actors::requester();
    $waiting = Records::create($owner);
    Records::submitted($waiting, $owner);
    $approving = Records::create($owner);
    Records::submitted($approving, $owner, 'PENDING_APPROVAL');

    signIn(Actors::reviewer())->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('counts.reviews.count', 1)
            ->missing('counts.approvals')
            ->where('counts.drafts.count', 0)
            ->where('items.reviews.0.id', $waiting));

    $approver = actorWith(['nscmf.view', 'nscmf.approve']);
    signIn($approver)->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('counts.approvals.count', 1)
            ->missing('counts.reviews')
            ->where('items.approvals.0.id', $approving));
});

it('counts the pools Team-neutrally and leaves other Teams\' drafts out of them', function (): void {
    $ownerA = Actors::requester();
    $ownerB = Actors::requester();
    Records::submitted(Records::create($ownerA), $ownerA);
    Records::submitted(Records::create($ownerB), $ownerB);
    Records::create($ownerB);

    signIn(Actors::reviewer())->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('counts.reviews.count', 2)->where('counts.drafts.count', 0));
});

it('reads the dashboard without writing any audit row', function (): void {
    signIn(Actors::requester())->get('/dashboard')->assertOk();

    expect(DB::table('business_audit_events')->count())->toBe(0)
        ->and(DB::table('access_audit_events')->count())->toBe(0);
});

/*
 * G22 — Dashboard analytics (12 §44.1, 04 §12.1, 07 §17.1). Stored times are Asia/Jakarta wall
 * time, so the boundary rows below are written exactly as the business day sees them.
 */

/** Today in Asia/Jakarta is 2026-09-24, half an hour after midnight: the window is 08-28 … 09-24. */
function atJakartaMidnight(): void
{
    travelTo(CarbonImmutable::parse('2026-09-24 00:30:00', 'Asia/Jakarta'));
}

/** Sets the analytics timestamps of a test record directly. */
function stamp(int $recordId, string $column, string $at): void
{
    DB::table('nscmf_records')->where('id', $recordId)->update([$column => $at]);
}

/** Moves the approval time of iteration $iterationNo of $recordId to $at. */
function approvedAt(int $recordId, int $iterationNo, string $at): void
{
    DB::table('nscmf_workflow_iterations')->where(['nscmf_record_id' => $recordId, 'iteration_no' => $iterationNo])->update(['approved_at' => $at]);
}

it('reports the actor\'s own activity for the last 28 Jakarta days in four weekly buckets', function (): void {
    atJakartaMidnight();
    $owner = Actors::requester();
    $approver = Actors::approver();
    Records::create($owner, overrides: ['created_at' => '2026-08-27 23:59:59']);
    Records::create($owner, overrides: ['created_at' => '2026-08-28 00:00:00']);
    $submittedToday = Records::create($owner, overrides: ['created_at' => '2026-09-24 00:10:00']);
    Records::submitted($submittedToday, $owner);
    stamp($submittedToday, 'first_submitted_at', '2026-09-24 00:20:00');
    $approvedTwice = Records::create($owner, overrides: ['created_at' => '2026-08-01 09:00:00']);
    Records::closed($approvedTwice, $owner, $approver);
    stamp($approvedTwice, 'first_submitted_at', '2026-08-02 09:00:00');
    Records::reapproved($approvedTwice, $approver, $approver);
    approvedAt($approvedTwice, 1, '2026-09-05 10:00:00');
    approvedAt($approvedTwice, 2, '2026-09-20 09:00:00');
    Records::create(Actors::requester(), overrides: ['created_at' => '2026-09-10 09:00:00']);

    signIn($owner)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('analytics.period', ['from' => '2026-08-28', 'through' => '2026-09-24', 'timezone' => 'Asia/Jakarta'])
            ->where('analytics.mine.totals_28d', ['created' => 2, 'first_submitted' => 1, 'approval_decisions' => 2])
            ->where('analytics.mine.weekly', [
                ['from' => '2026-08-28', 'through' => '2026-09-03', 'created' => 1, 'first_submitted' => 0, 'approval_decisions' => 0],
                ['from' => '2026-09-04', 'through' => '2026-09-10', 'created' => 0, 'first_submitted' => 0, 'approval_decisions' => 1],
                ['from' => '2026-09-11', 'through' => '2026-09-17', 'created' => 0, 'first_submitted' => 0, 'approval_decisions' => 0],
                ['from' => '2026-09-18', 'through' => '2026-09-24', 'created' => 1, 'first_submitted' => 1, 'approval_decisions' => 1],
            ]));
});

it('counts the actor\'s active records per business status and leaves archived ones out', function (): void {
    $owner = Actors::requester();
    $approver = Actors::approver();
    Records::create($owner);
    Records::submitted(Records::create($owner), $owner, 'REVISION_REQUIRED');
    Records::closed(Records::create($owner), $owner, $approver);
    $archived = Records::create($owner);
    Records::closed($archived, $owner, $approver);
    stamp($archived, 'is_archived', '1');

    signIn($owner)->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('analytics.mine.active_status_counts', [
            ['status' => 'DRAFT', 'count' => 1],
            ['status' => 'PENDING_REVIEW', 'count' => 0],
            ['status' => 'REVISION_REQUIRED', 'count' => 1],
            ['status' => 'PENDING_APPROVAL', 'count' => 0],
            ['status' => 'REJECTED', 'count' => 0],
            ['status' => 'APPROVED', 'count' => 1],
            ['status' => 'CANCELLED', 'count' => 0],
        ]));
});

it('sends organization analytics only to actors holding both analytics and History', function (User $actor, bool $organization): void {
    signIn($actor)->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $organization
            ? $page->has('analytics.mine')->has('analytics.organization')
            : $page->has('analytics.mine')->missing('analytics.organization'));
})->with([
    'Requester bundle' => [fn () => Actors::requester(), false],
    'Reviewer bundle' => [fn () => Actors::reviewer(), false],
    'Approver bundle' => [fn () => Actors::approver(), false],
    'analytics alone' => [fn () => Actors::member(['nscmf.analytics.view']), false],
    'History alone' => [fn () => Actors::member(['nscmf.view.history']), false],
    'custom role with both' => [fn () => Actors::member(['nscmf.analytics.view', 'nscmf.view.history']), true],
    // A non-protected holder of the bundle: the Protected Superadmin is sent to setup first.
    'Superadmin bundle' => [fn () => Actors::member(PermissionCatalog::defaultRoleBundles()[PermissionCatalog::ROLE_SUPERADMIN]), true],
]);

it('aggregates the organization over submitted records only, without Request No or owner', function (): void {
    atJakartaMidnight();
    $owner = Actors::requester();
    $approver = Actors::approver();
    Records::create($owner);
    Records::create($owner, overrides: ['business_status' => 'CANCELLED']);
    Records::submitted(Records::create($owner), $owner);
    Records::closed(Records::create($owner), $owner, $approver);
    $archived = Records::create($owner);
    Records::closed($archived, $owner, $approver);
    stamp($archived, 'is_archived', '1');

    signIn(Actors::member(['nscmf.analytics.view', 'nscmf.view.history']))->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('analytics.organization', fn (AssertableInertia $organization) => $organization
            ->where('totals_28d', ['first_submitted' => 3, 'approval_decisions' => 2])
            ->where('weekly.3', ['from' => '2026-09-18', 'through' => '2026-09-24', 'first_submitted' => 3, 'approval_decisions' => 2])
            ->has('weekly', 4)
            ->where('active_status_counts', [
                ['status' => 'PENDING_REVIEW', 'count' => 1],
                ['status' => 'REVISION_REQUIRED', 'count' => 0],
                ['status' => 'PENDING_APPROVAL', 'count' => 0],
                ['status' => 'REJECTED', 'count' => 0],
                ['status' => 'APPROVED', 'count' => 1],
            ])));
});
