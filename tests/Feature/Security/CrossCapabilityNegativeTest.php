<?php

declare(strict_types=1);

use App\Infrastructure\Malware\MalwareScanner;
use App\Services\Attachment\AttachmentFinalizationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Actors;
use Tests\Support\FakeScanner;
use Tests\Support\Records;

/*
 * BE-141 / T73 — negative security suite across capabilities (10; 12 §17.1, §102): identifiers
 * from one resource never unlock another, and Team never grants anything.
 */

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Queue::fake();
    app()->instance(MalwareScanner::class, new FakeScanner);
});

it('never serves an attachment through another record id, nor an upload session to another user', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $otherRecord = Records::create($owner);
    $uploadId = signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads", ['filename' => 'a.txt', 'size_bytes' => 5])->json('data.upload_id');
    assert(is_string($uploadId));
    signIn($owner)->call('PUT', "/nscmf/{$recordId}/attachment-uploads/{$uploadId}/chunks/1", [], [], [], ['CONTENT_TYPE' => 'application/octet-stream', 'HTTP_ACCEPT' => 'application/json'], 'hello')->assertOk();
    signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}/complete")->assertStatus(202);
    $sessionId = DB::table('nscmf_attachment_upload_sessions')->value('id');
    app(AttachmentFinalizationService::class)->finalize(is_int($sessionId) ? $sessionId : 0);
    $attachmentId = DB::table('nscmf_attachments')->value('id');
    assert(is_int($attachmentId));

    signIn($owner)->getJson("/nscmf/{$otherRecord}/attachments/{$attachmentId}")->assertNotFound();
    signIn($owner)->get("/nscmf/{$otherRecord}/attachments/{$attachmentId}/download")->assertNotFound();
    signIn($owner)->getJson("/nscmf/{$otherRecord}/attachment-uploads/{$uploadId}")->assertNotFound();
    signIn(Actors::requester())->getJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}")->assertNotFound();
    signIn(Actors::reviewer())->deleteJson("/nscmf/{$recordId}/attachments/{$attachmentId}")->assertNotFound();
});

it('refuses every workflow action by Team membership alone', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, Actors::reviewer());
    $sameTeamWithoutPermission = Actors::user(['nscmf.view'], ['team_id' => $owner->team_id]);

    foreach (['approval/approve' => [], 'approval/reject' => ['reason' => 'Same team.'], 'review/return' => ['reason' => 'Same team.']] as $action => $body) {
        signIn($sameTeamWithoutPermission)->postJson("/nscmf/{$recordId}/{$action}", ['record_version' => 1, ...$body])->assertForbidden();
    }
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_APPROVAL');
});

it('rejects forbidden authorization inputs in any mutation body', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, Actors::reviewer());

    foreach (['business_status' => 'APPROVED', 'team_id' => 1, 'approved_by_user_id' => 1, 'permissions' => ['nscmf.approve']] as $key => $value) {
        signIn(Actors::approver())->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 1, $key => $value])->assertUnprocessable();
    }
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_APPROVAL');
});
