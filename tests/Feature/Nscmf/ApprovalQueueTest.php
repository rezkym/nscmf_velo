<?php

declare(strict_types=1);

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-067 / T26 — the Team-neutral Approval queue and detail (04 §21–29, 12 §13–16, §44, §46).
 */

it('lists PENDING_APPROVAL records to every eligible approver, whatever their Team', function (): void {
    $owner = Actors::requester();
    $reviewer = Actors::reviewer();
    $waiting = Records::create($owner);
    Records::forwarded($waiting, $owner, $reviewer);
    Records::submitted(Records::create($owner), $owner);

    foreach ([Actors::approver(), Actors::approver(['team_id' => Actors::team('Team Other')->id])] as $approver) {
        signIn($approver)->get('/approval')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Approval/Index')
                ->has('items', 1)
                ->where('items.0.id', $waiting)
                ->where('items.0.business_status', 'PENDING_APPROVAL')
                ->where('meta.per_page', 25)
                ->where('meta.total', 1));
    }
});

it('refuses the queue and the detail without nscmf.approve, even through a handcrafted URL', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, Actors::reviewer());

    signIn(Actors::reviewer())->get('/approval')->assertForbidden();
    signIn(Actors::reviewer())->getJson("/approval/{$recordId}")->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
});

it('filters by Team as metadata only and keeps pagination bounded', function (): void {
    $owner = Actors::requester();
    $reviewer = Actors::reviewer();
    $other = Actors::requester(['team_id' => Actors::team('Team Beta')->id]);
    foreach ([$owner, $owner, $other] as $submitter) {
        Records::forwarded(Records::create($submitter), $submitter, $reviewer);
    }
    $approver = Actors::approver();

    signIn($approver)->get('/approval?per_page=2&page=2')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 1)->where('meta.last_page', 2));

    signIn($approver)->get('/approval?team_id='.$other->team_id)
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('items', 1)
            ->where('items', fn (Collection $items): bool => $items->every(fn (mixed $item): bool => data_get($item, 'team.id') === $other->team_id)));
});

it('opens the detail with approval action hints and claims nothing', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, Actors::reviewer());

    signIn(Actors::approver())->get("/approval/{$recordId}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Approval/Show', false) // page owned by FE-33
            ->where('record.id', $recordId)
            ->where('record.business_status', 'PENDING_APPROVAL')
            ->where('record.allowed_actions', ['nscmf.approve', 'nscmf.approval.return_reviewer', 'nscmf.approval.return_requester', 'nscmf.approval.reject'])
            ->has('attachments'));

    expect(DB::table('business_audit_events')->count())->toBe(0);
});
