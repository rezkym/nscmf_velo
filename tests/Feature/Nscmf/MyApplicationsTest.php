<?php

declare(strict_types=1);

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\get;

/*
 * BE-155 / G25 — My Applications lists the actor's own records only (12 §47.1, 07 §34.1).
 */

it('lists every own record, including a Draft and a Cancelled one, and nobody else\'s', function (): void {
    $owner = Actors::requester();
    $other = Actors::requester();
    $draft = Records::create($owner);
    $cancelled = Records::create($owner, overrides: ['business_status' => 'CANCELLED']);
    $submitted = Records::create($owner);
    Records::submitted($submitted, $owner);
    $foreign = Records::create($other);
    Records::submitted($foreign, $other);

    signIn($owner)->get('/my-applications')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('MyApplications/Index', false)
            ->where('items', fn (Collection $items): bool => $items->pluck('id')->sort()->values()->all() === [$draft, $cancelled, $submitted])
            ->where('meta.total', 3)
            ->where('query.page', 1)
            ->where('query.per_page', 25));
});

it('never lists an archived record, whatever the client asks for', function (): void {
    $owner = Actors::requester();
    $active = Records::create($owner);
    $archived = Records::create($owner, overrides: ['business_status' => 'CANCELLED']);
    DB::table('nscmf_records')->where('id', $archived)->update(['is_archived' => true, 'archived_at' => now(), 'archived_by_user_id' => $owner->id, 'archive_reason' => 'Done.']);
    $foreign = Records::create(Actors::requester());
    Records::submitted($foreign, Actors::requester());

    signIn($owner)->get("/my-applications?archived=1&owner_user_id={$foreign}&team_id=999")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('items', fn (Collection $items): bool => $items->pluck('id')->all() === [$active])
            ->where('query.archived', false)
            ->where('query.owner_user_id', $owner->id)
            ->where('query.team_id', null));
});

it('searches by Request No, filters by status, sorts and pages', function (): void {
    $owner = Actors::requester();
    $alpha = Records::create($owner, overrides: ['request_no' => 'NS-ALPHA-1', 'request_no_normalized' => 'ns-alpha-1']);
    $beta = Records::create($owner, overrides: ['request_no' => 'NS-BETA-1', 'request_no_normalized' => 'ns-beta-1']);
    Records::submitted($beta, $owner);
    Records::create($owner, overrides: ['request_no' => 'NS-BETA-2', 'request_no_normalized' => 'ns-beta-2']);

    signIn($owner)->get('/my-applications?q=beta&business_status=PENDING_REVIEW')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('items', fn (Collection $items): bool => $items->pluck('id')->all() === [$beta]));

    signIn($owner)->get('/my-applications?sort=request_no&direction=desc&per_page=1&page=3')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('items.0.id', $alpha)
            ->where('meta.current_page', 3)
            ->where('meta.last_page', 3));
});

it('ignores the History-only filters', function (): void {
    $owner = Actors::requester();
    $change = Records::create($owner);

    signIn($owner)->get('/my-applications?family=ACTIVATION&request_date_from=2999-01-01')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('items.0.id', $change)
            ->where('query.family', null)
            ->where('query.request_date_from', null));
});

it('rejects a guest, an invalid query and an actor without nscmf.view', function (): void {
    get('/my-applications')->assertRedirect('/login');
    signIn(Actors::requester())->get('/my-applications?per_page=101')->assertSessionHasErrors('per_page');
    signIn(Actors::requester())->get('/my-applications?sort=owner_user_id')->assertSessionHasErrors('sort');
    signIn(Actors::user(['nscmf.create']))->get('/my-applications')->assertForbidden();
});
