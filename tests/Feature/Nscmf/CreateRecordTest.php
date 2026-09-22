<?php

declare(strict_types=1);

use App\Models\Team;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;

use function Pest\Laravel\travelTo;

/*
 * BE-045..BE-047 / T16–T17 — create an NSCMF with server numbering, owner and Team snapshot
 * (06 §15–20, 11 §13–15, 12 §25).
 */

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-09-22 10:00:00', 'Asia/Jakarta')));

it('renders the create page for nscmf.create only', function (): void {
    signIn(Actors::requester())->get('/nscmf/create')->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('Nscmf/Create'));
    signIn(Actors::reviewer())->get('/nscmf/create')->assertForbidden();
});

it('creates a Draft with an automatic monthly number, owner, Team snapshot, version 1 and detail row', function (): void {
    $user = Actors::requester();

    $response = signIn($user)->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC', 'request_no' => null]);

    $record = DB::table('nscmf_records')->sole();
    $response->assertStatus(303)->assertRedirect('/nscmf/'.json_encode($record->id).'/edit');

    expect($record->request_no)->toBe('NSCMF-202609-00001')
        ->and($record->request_no_normalized)->toBe('nscmf-202609-00001')
        ->and($record->business_status)->toBe('DRAFT')
        ->and($record->record_version)->toBe(1)
        ->and($record->owner_user_id)->toBe($user->id)
        ->and($record->team_id)->toBe($user->team_id)
        ->and($record->request_date)->toBeNull()
        ->and($record->requested_by_user_id)->toBeNull()
        ->and($record->current_workflow_iteration_id)->toBeNull()
        ->and(DB::table('nscmf_change_details')->where('nscmf_record_id', $record->id)->exists())->toBeTrue()
        ->and(DB::table('nscmf_activation_details')->count())->toBe(0);

    $audit = DB::table('business_audit_events')->sole();
    expect($audit->event_type)->toBe('RECORD_CREATED')
        ->and($audit->actor_user_id)->toBe($user->id)
        ->and($audit->to_status)->toBe('DRAFT')
        ->and($audit->record_version_after)->toBe(1);
});

it('numbers globally per month across families and Teams, never reusing a value', function (): void {
    $first = Actors::requester();
    $second = Actors::requester();

    signIn($first)->post('/nscmf', ['family' => 'ACTIVATION', 'subtype' => 'ACTIVATION', 'numbering_mode' => 'AUTOMATIC']);
    signIn($second)->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'EMERGENCY', 'numbering_mode' => 'AUTOMATIC']);
    travelTo(CarbonImmutable::parse('2026-10-01 00:00:01', 'Asia/Jakarta'));
    signIn($first)->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'UPGRADE', 'numbering_mode' => 'AUTOMATIC']);

    expect(DB::table('nscmf_records')->orderBy('id')->pluck('request_no')->all())
        ->toBe(['NSCMF-202609-00001', 'NSCMF-202609-00002', 'NSCMF-202610-00001'])
        ->and(DB::table('nscmf_activation_details')->count())->toBe(1);
});

it('keeps an allocated automatic number consumed when the create fails afterwards', function (): void {
    $user = Actors::requester();
    DB::table('nscmf_number_sequences')->insert(['year_month' => '202609', 'last_value' => 41, 'updated_at' => now()]);
    DB::table('nscmf_records')->insert([
        'request_no' => 'NSCMF-202609-00042', 'request_no_normalized' => 'nscmf-202609-00042', 'numbering_mode' => 'MANUAL',
        'family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'owner_user_id' => $user->id, 'team_id' => $user->team_id,
        'business_status' => 'DRAFT', 'record_version' => 1, 'is_archived' => false, 'created_at' => now(), 'updated_at' => now(),
    ]);

    signIn($user)->from('/nscmf/create')->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertRedirect('/nscmf/create');
    signIn($user)->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC']);

    expect(DB::table('nscmf_records')->pluck('request_no')->all())->toContain('NSCMF-202609-00043')
        ->and(DB::table('nscmf_number_sequences')->where('year_month', '202609')->value('last_value'))->toBe(43);
});

it('normalizes a manual number and rejects case-insensitive duplicates and invalid shapes', function (): void {
    $user = Actors::requester();

    signIn($user)->post('/nscmf', ['family' => 'ACTIVATION', 'subtype' => 'DEACTIVATION', 'numbering_mode' => 'MANUAL', 'request_no' => '  Ops/2026-001  '])
        ->assertStatus(303);
    expect(DB::table('nscmf_records')->value('request_no'))->toBe('Ops/2026-001')
        ->and(DB::table('nscmf_records')->value('request_no_normalized'))->toBe('ops/2026-001');

    foreach (['OPS/2026-001', 'ab', 'has space', '-lead', '../', str_repeat('a', 65), ''] as $invalid) {
        signIn($user)->from('/nscmf/create')->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'MANUAL', 'request_no' => $invalid])
            ->assertSessionHasErrors('request_no');
    }

    expect(DB::table('nscmf_records')->count())->toBe(1);
});

it('refuses a request number for automatic mode and invalid family/subtype pairs', function (): void {
    $user = Actors::requester();

    signIn($user)->from('/nscmf/create')->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC', 'request_no' => 'X-123'])
        ->assertSessionHasErrors('request_no');
    signIn($user)->from('/nscmf/create')->post('/nscmf', ['family' => 'ACTIVATION', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertSessionHasErrors('subtype');
    signIn($user)->from('/nscmf/create')->post('/nscmf', ['family' => 'OTHER', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertSessionHasErrors('family');

    expect(DB::table('nscmf_records')->count())->toBe(0);
});

it('rejects spoofed owner, status, version and Team inputs', function (): void {
    $user = Actors::requester();
    $other = Actors::requester();

    signIn($user)->from('/nscmf/create')->post('/nscmf', [
        'family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC',
        'owner_user_id' => $other->id, 'business_status' => 'APPROVED', 'record_version' => 9, 'team_id' => $other->team_id,
    ])->assertSessionHasErrors(['owner_user_id', 'business_status', 'record_version', 'team_id']);

    expect(DB::table('nscmf_records')->count())->toBe(0);
});

it('requires an active Team and leaves no record or number behind otherwise', function (): void {
    $withoutTeam = Actors::user(['nscmf.create']);
    $inactiveTeamUser = Actors::requester();
    $team = $inactiveTeamUser->team;
    assert($team instanceof Team);
    $team->update(['is_active' => false]);

    signIn($withoutTeam)->from('/nscmf/create')->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'ACTIVE_TEAM_REQUIRED');
    signIn($inactiveTeamUser)->from('/nscmf/create')->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'ACTIVE_TEAM_REQUIRED');

    expect(DB::table('nscmf_records')->count())->toBe(0)
        ->and(DB::table('nscmf_number_sequences')->count())->toBe(0);
});

it('keeps the record Team snapshot when the owner later moves Team', function (): void {
    $user = Actors::requester();
    signIn($user)->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC']);
    $originalTeam = $user->team_id;

    $user->update(['team_id' => Actors::team('Moved')->id]);

    expect(DB::table('nscmf_records')->value('team_id'))->toBe($originalTeam);
});

it('refuses creation without nscmf.create', function (): void {
    signIn(Actors::reviewer())->post('/nscmf', ['family' => 'CHANGE', 'subtype' => 'MAINTENANCE', 'numbering_mode' => 'AUTOMATIC'])
        ->assertForbidden();
    expect(DB::table('nscmf_records')->count())->toBe(0);
});
