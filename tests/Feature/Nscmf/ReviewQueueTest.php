<?php

declare(strict_types=1);

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-066 / T23 — the Team-neutral Review queue (04 §13, 12 §13–16, §44–45).
 */

it('lists PENDING_REVIEW records to any eligible reviewer, whatever their Team', function (): void {
    $ownerA = Actors::requester();
    $ownerB = Actors::requester();
    $waiting = Records::create($ownerA, 'CHANGE', 'MAINTENANCE');
    Records::submitted($waiting, $ownerA);
    $alsoWaiting = Records::create($ownerB, 'ACTIVATION', 'ACTIVATION');
    Records::submitted($alsoWaiting, $ownerB);
    $draft = Records::create($ownerA);
    $approved = Records::create($ownerA);
    Records::submitted($approved, $ownerA, 'APPROVED');

    foreach ([Actors::reviewer(), Actors::reviewer()] as $reviewer) {
        signIn($reviewer)->get('/review')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Review/Index')
                ->has('items', 2)
                ->where('items', fn (Collection $items): bool => $items->pluck('id')->sort()->values()->all() === collect([$waiting, $alsoWaiting])->sort()->values()->all())
                ->where('items.0.requester.id', $ownerA->id)
                ->where('items.0.business_status', 'PENDING_REVIEW')
                ->where('items.0.is_archived', false)
                ->has('items.0.team.name')
                ->where('meta.per_page', 25)
                ->where('meta.total', 2)
                ->where('query.page', 1));
    }

    unset($draft, $approved);
});

it('opening the queue claims nothing and writes no Business Timeline row', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    signIn(Actors::reviewer())->get('/review')->assertOk();

    expect(DB::table('nscmf_workflow_iterations')->where('id', DB::table('nscmf_records')->where('id', $recordId)->value('current_workflow_iteration_id'))->value('reviewed_by_user_id'))->toBeNull()
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('refuses the queue without nscmf.review, even through a handcrafted URL', function (): void {
    $owner = Actors::requester();
    Records::submitted(Records::create($owner), $owner);

    signIn($owner)->get('/review')->assertForbidden();
    signIn($owner)->getJson('/review?page=1&per_page=100')->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
});

it('paginates with the locked bounds, sorts on the whitelist and searches the request number', function (): void {
    $owner = Actors::requester();
    foreach (range(1, 3) as $index) {
        $recordId = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['request_no' => "QUEUE-{$index}", 'request_no_normalized' => "queue-{$index}"]);
        Records::submitted($recordId, $owner);
    }
    $reviewer = Actors::reviewer();

    signIn($reviewer)->get('/review?per_page=2&page=2')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 1)->where('meta.current_page', 2)->where('meta.last_page', 2)->where('meta.per_page', 2));

    signIn($reviewer)->get('/review?sort=request_no&direction=desc')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('items.0.request_no', 'QUEUE-3')->where('query.sort', 'request_no')->where('query.direction', 'desc'));

    signIn($reviewer)->get('/review?q=queue-2')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 1)->where('items.0.request_no', 'QUEUE-2')->where('query.q', 'queue-2'));

    signIn($reviewer)->from('/review')->get('/review?per_page=101')->assertSessionHasErrors('per_page');
    signIn($reviewer)->from('/review')->get('/review?sort=owner_user_id')->assertSessionHasErrors('sort');
    signIn($reviewer)->from('/review')->get('/review?direction=sideways')->assertSessionHasErrors('direction');
});

it('never leaks a record that is not waiting for review', function (): void {
    $owner = Actors::requester();
    $archived = Records::create($owner);
    Records::submitted($archived, $owner);
    DB::table('nscmf_records')->where('id', $archived)->update(['business_status' => 'APPROVED', 'is_archived' => true, 'archived_at' => now(), 'archived_by_user_id' => $owner->id, 'archive_reason' => 'done']);

    signIn(Actors::reviewer())->get('/review')->assertInertia(fn (AssertableInertia $page) => $page->has('items', 0)->where('meta.total', 0));
});
