<?php

declare(strict_types=1);

use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\patchJson;

/*
 * BE-048/BE-061/BE-062 backend — authorization, state, version and header rules of the
 * Draft save (12 §17.1, §21, §26, §26.1, §28.2; 05 §30; 06 §19–21).
 */

it('answers 401 without a session and 403/404 for actors who may not edit', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => []])->assertStatus(401);
    signIn(Actors::requester())->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => []])
        ->assertNotFound()->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    Records::submitted($recordId, $owner, 'REVISION_REQUIRED');
    signIn(Actors::requester())->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => []])
        ->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');

    $withoutPermission = Actors::member(['nscmf.view']);
    DB::table('nscmf_records')->where('id', $recordId)->update(['owner_user_id' => $withoutPermission->id]);
    signIn($withoutPermission)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => []])
        ->assertForbidden();

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('refuses a stale version with 409 and the latest version as context, changing nothing', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['rollback_scenario' => 'First']])->assertOk();

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['rollback_scenario' => 'Stale overwrite']])
        ->assertStatus(409)
        ->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 2)
        ->assertJsonPath('context.current_business_status', 'DRAFT');

    expect(DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->value('rollback_scenario'))->toBe('First')
        ->and(Records::version($recordId))->toBe(2)
        ->and(DB::table('business_audit_events')->count())->toBe(1);
});

it('refuses states that are not editable, and rejects results sent while PENDING_REVIEW', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner, 'PENDING_REVIEW');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['results' => []]])
        ->assertStatus(422)->assertJsonValidationErrors('change.results', 'errors');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['rollback_scenario' => 'x']])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT')->assertJsonPath('context.current_business_status', 'PENDING_REVIEW');

    DB::table('nscmf_records')->where('id', $recordId)->update(['business_status' => 'APPROVED']);
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => []])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
});

it('rejects the other family key, unknown top-level keys and missing record_version', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => ['customer_name' => 'x']])
        ->assertStatus(422)->assertJsonValidationErrors('activation', 'errors');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'business_status' => 'APPROVED'])
        ->assertStatus(422)->assertJsonValidationErrors('business_status', 'errors');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['change' => []])
        ->assertStatus(422)->assertJsonValidationErrors('record_version', 'errors');

    expect(Records::version($recordId))->toBe(1);
});

it('saves the header date and corrects a manual number while never submitted', function (): void {
    travelToJakarta('2026-09-22 09:00:00');
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['request_no' => 'OLD-001', 'request_no_normalized' => 'old-001']);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-09-25', 'request_no' => '  New/001 ']])
        ->assertOk();

    $record = DB::table('nscmf_records')->where('id', $recordId)->sole();
    expect($record->request_date)->toBe('2026-09-25')
        ->and($record->request_no)->toBe('New/001')
        ->and($record->request_no_normalized)->toBe('new/001');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'header' => ['request_date' => null]])->assertOk();
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('request_date'))->toBeNull()
        ->and(DB::table('business_audit_changes')->where('field_path', 'header.request_no')->value('old_value_text'))->toBe('OLD-001');
});

it('refuses header number changes that the rules forbid', function (): void {
    $owner = Actors::requester();
    $manual = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['request_no' => 'KEEP-001', 'request_no_normalized' => 'keep-001']);
    $automatic = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['numbering_mode' => 'AUTOMATIC']);
    $revision = Records::create($owner, 'CHANGE', 'MAINTENANCE', ['request_no' => 'REV-001', 'request_no_normalized' => 'rev-001']);
    Records::submitted($revision, $owner, 'REVISION_REQUIRED');

    signIn($owner)->patchJson("/nscmf/{$manual}/draft", ['record_version' => 1, 'header' => ['request_no' => 'rev-001']])
        ->assertStatus(422)->assertJsonPath('code', 'REQUEST_NO_CONFLICT')->assertJsonValidationErrors('header.request_no', 'errors');
    signIn($owner)->patchJson("/nscmf/{$manual}/draft", ['record_version' => 1, 'header' => ['request_no' => null]])
        ->assertStatus(422)->assertJsonValidationErrors('header.request_no', 'errors');
    signIn($owner)->patchJson("/nscmf/{$manual}/draft", ['record_version' => 1, 'header' => ['request_no' => 'x y']])
        ->assertStatus(422)->assertJsonValidationErrors('header.request_no', 'errors');
    signIn($owner)->patchJson("/nscmf/{$automatic}/draft", ['record_version' => 1, 'header' => ['request_no' => 'MINE-001']])
        ->assertStatus(422)->assertJsonValidationErrors('header.request_no', 'errors');
    signIn($owner)->patchJson("/nscmf/{$revision}/draft", ['record_version' => 1, 'header' => ['request_no' => 'REV-002']])
        ->assertStatus(422)->assertJsonValidationErrors('header.request_no', 'errors');
    signIn($owner)->patchJson("/nscmf/{$manual}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-13-01']])
        ->assertStatus(422)->assertJsonValidationErrors('header.request_date', 'errors');
    signIn($owner)->patchJson("/nscmf/{$manual}/draft", ['record_version' => 1, 'header' => ['family' => 'ACTIVATION']])
        ->assertStatus(422)->assertJsonValidationErrors('header.family', 'errors');

    signIn($owner)->patchJson("/nscmf/{$revision}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-09-20']])->assertOk();

    expect(DB::table('nscmf_records')->where('id', $manual)->value('request_no'))->toBe('KEEP-001')
        ->and(DB::table('nscmf_records')->where('id', $revision)->value('request_no'))->toBe('REV-001');
});

it('rolls back the whole save when the audit write fails', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    app()->instance(BusinessAuditRepository::class, new class implements BusinessAuditRepository
    {
        public function appendEvent(array $event, array $changes): int
        {
            throw new RuntimeException('audit storage unavailable');
        }
    });

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => [
        'rollback_scenario' => 'Would be lost', 'facing_challenges' => [['row_no' => 1, 'challenge_text' => 'Would be lost']],
    ]])->assertStatus(500)->assertJsonPath('code', 'SERVER_ERROR');

    expect(DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->value('rollback_scenario'))->toBeNull()
        ->and(DB::table('nscmf_change_facing_challenges')->where('nscmf_record_id', $recordId)->count())->toBe(0)
        ->and(Records::version($recordId))->toBe(1);
});

function travelToJakarta(string $moment): void
{
    Pest\Laravel\travelTo(CarbonImmutable::parse($moment, 'Asia/Jakarta'));
}
