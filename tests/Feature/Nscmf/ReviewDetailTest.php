<?php

declare(strict_types=1);

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * GET /review/{record} (12 §44–45; 04 Team-neutral review; 10 §544 access audit; 12 §17.1
 * visibility). Written from the specification: the page is permission- and resource-driven,
 * never Team-scoped, and a view is access evidence, not a business event.
 */

it('opens a submitted record for any reviewer, whatever their Team', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $reviewer = Actors::reviewer(['team_id' => Actors::team('Another Team')->id]);

    signIn($reviewer)->get("/review/{$recordId}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Review/Show', false)
            ->where('record.id', $recordId)
            ->where('record.business_status', 'PENDING_REVIEW')
            ->where('record.allowed_actions', fn (Collection $actions): bool => $actions->contains('nscmf.review.forward'))
            ->has('record.forward_readiness.ready')
            ->has('attachments'));
});

it('records the view as access evidence only, never as a business event', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $reviewer = Actors::reviewer();

    signIn($reviewer)->get("/review/{$recordId}")->assertOk();

    expect(DB::table('access_audit_events')->where('event_type', 'RECORD_VIEWED')->where('actor_user_id', $reviewer->id)->where('nscmf_record_id', $recordId)->count())->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('refuses an actor without the review permission', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    signIn(Actors::approver())->getJson("/review/{$recordId}")->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    signIn(Actors::user(['nscmf.view']))->getJson("/review/{$recordId}")->assertForbidden();
});

it('hides a never-submitted Draft of someone else, even from a reviewer', function (): void {
    $recordId = Records::create(Actors::requester());

    signIn(Actors::reviewer())->getJson("/review/{$recordId}")->assertNotFound();
    signIn(Actors::reviewer())->getJson('/review/999999')->assertNotFound();
    expect(DB::table('access_audit_events')->count())->toBe(0);
});

it('says why a record is not ready to forward instead of offering a blind forward', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    // A bare submitted Change has no recorded Result yet (12 §32 forward precondition).
    signIn(Actors::reviewer())->get("/review/{$recordId}")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('record.forward_readiness.ready', false)
            ->where('record.forward_readiness.reason', fn (mixed $reason): bool => is_string($reason) && $reason !== ''));
});

it('requires a signed-in user', function (): void {
    $recordId = Records::create(Actors::requester());

    asGuest()->get("/review/{$recordId}")->assertRedirect('/login');
});
