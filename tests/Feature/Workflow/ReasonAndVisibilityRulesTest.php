<?php

declare(strict_types=1);

use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Shared\DomainRuleException;
use App\Services\Nscmf\NscmfLifecycleService;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * Rules the 2026-09-24 end-to-end audit found unenforced:
 * - 06 §54 / 12 §39: a mandatory reason has at least 5 meaningful characters; decided
 *   2026-09-24 as at least 5 non-whitespace characters.
 * - 12 §17.1: a submitted record is visible only to actors holding a read permission
 *   (nscmf.view, nscmf.view.history or a queue permission); an action permission alone does
 *   not reveal it.
 * - 05 §21 / 12 §40: Reopen targets only REVISION_REQUIRED or PENDING_REVIEW, whoever calls.
 */

it('refuses a mandatory reason with fewer than five non-whitespace characters', function (string $action, string $status): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $status === 'PENDING_REVIEW' ? Records::submitted($recordId, $owner) : Records::closed($recordId, $owner, Actors::approver(), $status);
    $actor = Actors::user(['nscmf.view', 'nscmf.review.return', 'nscmf.reopen', 'nscmf.archive']);
    $extra = $action === 'reopen' ? ['destination_status' => 'PENDING_REVIEW'] : [];

    signIn($actor)->postJson("/nscmf/{$recordId}/{$action}", ['record_version' => 1, 'reason' => "a \t b \n  c", ...$extra])
        ->assertUnprocessable()->assertJsonValidationErrors('reason', 'errors');
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe($status);

    signIn($actor)->postJson("/nscmf/{$recordId}/{$action}", ['record_version' => 1, 'reason' => 'a b c d e', ...$extra])
        ->assertSessionHasNoErrors()->assertJsonMissingValidationErrors('reason', 'errors');
})->with([
    'review return' => ['review/return', 'PENDING_REVIEW'],
    'reopen' => ['reopen', 'APPROVED'],
    'archive' => ['archive', 'REJECTED'],
]);

it('does not reveal a submitted record through an action permission alone', function (string $permission, string $action, array $body): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, Actors::approver());

    signIn(Actors::user([$permission]))->postJson("/nscmf/{$recordId}/{$action}", ['record_version' => 1, ...$body])->assertNotFound();
    signIn(Actors::user([$permission]))->getJson("/nscmf/{$recordId}/exports")->assertNotFound();

    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('APPROVED')
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('is_archived'))->toBe(0)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([
    'archive only' => ['nscmf.archive', 'archive', ['reason' => 'Closed out.']],
    'reopen only' => ['nscmf.reopen', 'reopen', ['reason' => 'Needs another look.', 'destination_status' => 'PENDING_REVIEW']],
]);

it('reveals a submitted record to each read permission of 12 §17.1', function (string $readPermission): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, Actors::approver(), 'REJECTED');

    signIn(Actors::user([$readPermission, 'nscmf.archive']))->postJson("/nscmf/{$recordId}/archive", ['record_version' => 1, 'reason' => 'Closed out.'])
        ->assertSessionHasNoErrors();
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('is_archived'))->toBe(1);
})->with(['nscmf.view', 'nscmf.view.history', 'nscmf.review', 'nscmf.approve']);

it('keeps the owner able to see their own submitted record', function (): void {
    $owner = Actors::member(['nscmf.submit']);
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    signIn($owner)->getJson("/nscmf/{$recordId}/timeline")->assertStatus(403);
});

it('refuses a Reopen destination other than Revision Required or Pending Review inside the service', function (NscmfStatus $destination): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, Actors::approver());
    $actor = Actors::user(['nscmf.view', 'nscmf.reopen']);

    expect(fn () => app(NscmfLifecycleService::class)->reopen($actor, $recordId, 1, 'Needs another look.', $destination))
        ->toThrow(DomainRuleException::class);
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('APPROVED')
        ->and(DB::table('nscmf_workflow_iterations')->count())->toBe(1);
})->with([NscmfStatus::APPROVED, NscmfStatus::PENDING_APPROVAL, NscmfStatus::DRAFT, NscmfStatus::CANCELLED, NscmfStatus::REJECTED]);
