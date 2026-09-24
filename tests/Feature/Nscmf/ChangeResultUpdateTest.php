<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\patchJson;

/*
 * BE-076 / T25 — the narrow Change Result update (06 §45–48, 11 §29, 12 §29).
 */

function resultsUrl(int $recordId): string
{
    return "/nscmf/{$recordId}/change-results";
}

/**
 * @return array{0: User, 1: int}
 */
function ownedChangeInReview(): array
{
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner, 'PENDING_REVIEW');

    return [$owner, $recordId];
}

it('replaces the result rows, increments the parent version once and audits the change', function (): void {
    [$owner, $recordId] = ownedChangeInReview();

    $response = signIn($owner)->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => [
        ['row_no' => 1, 'result_summary' => 'Module replaced.', 'performance_information' => 'Zero errors for 72 hours.', 'result_status' => 'SUCCESS'],
        ['row_no' => 2, 'result_summary' => 'Monitoring continues.', 'performance_information' => null, 'result_status' => 'Partial, watched'],
        ['row_no' => 3, 'result_summary' => null, 'performance_information' => null, 'result_status' => null],
    ]]);

    $response->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.id', $recordId)
        ->assertJsonPath('data.record_version', 2)
        ->assertJsonPath('data.results.0.result_status', 'SUCCESS')
        ->assertJsonPath('data.results.1.performance_information', null)
        ->assertJsonCount(2, 'data.results');

    expect(DB::table('nscmf_change_results')->where('nscmf_record_id', $recordId)->pluck('row_no')->all())->toBe([1, 2])
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW')
        ->and(Records::version($recordId))->toBe(2);

    $audit = DB::table('business_audit_events')->where('event_type', 'RESULT_UPDATED')->sole();
    expect($audit->record_version_before)->toBe(1)
        ->and($audit->record_version_after)->toBe(2)
        ->and($audit->workflow_iteration_id)->not->toBeNull()
        ->and(DB::table('business_audit_changes')->where('business_audit_event_id', $audit->id)->where('field_path', 'change.results')->exists())->toBeTrue();
});

it('clears every row with an empty set', function (): void {
    [$owner, $recordId] = ownedChangeInReview();
    signIn($owner)->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => [['row_no' => 1, 'result_summary' => 'x', 'performance_information' => 'y', 'result_status' => 'z']]])->assertOk();

    signIn($owner)->patchJson(resultsUrl($recordId), ['record_version' => 2, 'results' => []])->assertOk()->assertJsonPath('data.results', []);

    expect(DB::table('nscmf_change_results')->where('nscmf_record_id', $recordId)->count())->toBe(0);
});

it('accepts only record_version and results', function (array $payload, string $errorKey): void {
    [$owner, $recordId] = ownedChangeInReview();

    signIn($owner)->patchJson(resultsUrl($recordId), $payload)
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors($errorKey, 'errors');

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('nscmf_change_results')->count())->toBe(0);
})->with([
    'planning field' => [['record_version' => 1, 'results' => [], 'rollback_scenario' => 'x'], 'rollback_scenario'],
    'change wrapper' => [['record_version' => 1, 'change' => ['results' => []]], 'change'],
    'service impacts' => [['record_version' => 1, 'results' => [], 'service_impacts' => []], 'service_impacts'],
    'header' => [['record_version' => 1, 'results' => [], 'header' => ['request_date' => '2026-09-22']], 'header'],
    'workflow field' => [['record_version' => 1, 'results' => [], 'business_status' => 'APPROVED'], 'business_status'],
    'row database id' => [['record_version' => 1, 'results' => [['id' => 3, 'row_no' => 1, 'result_summary' => 'x']]], 'results.0.id'],
    'row 6' => [['record_version' => 1, 'results' => [['row_no' => 6, 'result_summary' => 'x']]], 'results.0.row_no'],
    'duplicate row' => [['record_version' => 1, 'results' => [['row_no' => 1, 'result_summary' => 'a'], ['row_no' => 1, 'result_summary' => 'b']]], 'results.1.row_no'],
    'long status' => [['record_version' => 1, 'results' => [['row_no' => 1, 'result_status' => str_repeat('a', 256)]]], 'results.0.result_status'],
    'missing version' => [['results' => []], 'record_version'],
    'results missing' => [['record_version' => 1], 'results'],
]);

it('refuses everyone but the owner with the permission, in PENDING_REVIEW, on a Change', function (): void {
    [$owner, $recordId] = ownedChangeInReview();
    $activationId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    Records::submitted($activationId, $owner, 'PENDING_REVIEW');
    $draftId = Records::create($owner);

    patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => []])->assertStatus(401);
    signIn(Actors::reviewer())->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => []])->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    signIn(Actors::member(['nscmf.view']))->patchJson(resultsUrl($draftId), ['record_version' => 1, 'results' => []])->assertNotFound();
    signIn($owner)->patchJson(resultsUrl($activationId), ['record_version' => 1, 'results' => []])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
    signIn($owner)->patchJson(resultsUrl($draftId), ['record_version' => 1, 'results' => []])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');

    $withoutPermission = Actors::member(['nscmf.view', 'nscmf.draft.edit']);
    DB::table('nscmf_records')->where('id', $recordId)->update(['owner_user_id' => $withoutPermission->id]);
    signIn($withoutPermission)->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => []])->assertForbidden();

    expect(DB::table('business_audit_events')->where('event_type', 'RESULT_UPDATED')->count())->toBe(0);
});

it('refuses a stale version with no partial change', function (): void {
    [$owner, $recordId] = ownedChangeInReview();
    signIn($owner)->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => [['row_no' => 1, 'result_summary' => 'First', 'performance_information' => 'p', 'result_status' => 's']]])->assertOk();

    signIn($owner)->patchJson(resultsUrl($recordId), ['record_version' => 1, 'results' => [['row_no' => 1, 'result_summary' => 'Overwrite', 'performance_information' => 'p', 'result_status' => 's']]])
        ->assertStatus(409)
        ->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 2);

    expect(DB::table('nscmf_change_results')->where('nscmf_record_id', $recordId)->value('result_summary'))->toBe('First')
        ->and(Records::version($recordId))->toBe(2);
});
