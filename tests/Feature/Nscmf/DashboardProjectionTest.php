<?php

declare(strict_types=1);

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

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
            ->where('counts.reviews', null)
            ->where('counts.approvals', null)
            ->has('items.drafts', 2)
            ->where('items.drafts.0.id', $draftA)
            ->has('items.drafts.0.request_no')
            ->has('items.drafts.0.team.name')
            ->where('items.revisions.0.id', $revision));
});

it('shows the shared pools only to actors who hold their permission', function (): void {
    $owner = Actors::requester();
    $waiting = Records::create($owner);
    Records::submitted($waiting, $owner);
    $approving = Records::create($owner);
    Records::submitted($approving, $owner, 'PENDING_APPROVAL');

    signIn(Actors::reviewer())->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('counts.reviews.count', 1)
            ->where('counts.approvals', null)
            ->where('counts.drafts.count', 0)
            ->where('items.reviews.0.id', $waiting));

    $approver = Actors::member(Arr::flatten([['nscmf.view'], ['nscmf.approve']]));
    signIn($approver)->get('/dashboard')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('counts.approvals.count', 1)
            ->where('counts.reviews', null)
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
