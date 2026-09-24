<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Attachment;

use App\Domain\Attachment\SecurityStatus;
use App\Domain\Attachment\UploadStatus;
use App\Models\Attachment\Attachment;
use App\Models\Attachment\UploadChunk;
use App\Models\Attachment\UploadSession;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;

final class EloquentAttachmentRepository implements AttachmentRepository
{
    public function slotsInUse(int $recordId): int
    {
        $attachments = Attachment::query()->where('nscmf_record_id', $recordId)->whereNull('removed_at')
            ->whereIn('security_status', [SecurityStatus::CLEAN->value, SecurityStatus::PENDING->value])->count();
        $sessions = UploadSession::query()->where('nscmf_record_id', $recordId)
            ->whereIn('upload_status', [UploadStatus::UPLOADING->value, UploadStatus::ASSEMBLING->value])->count();

        return $attachments + $sessions;
    }

    public function cleanCount(int $recordId): int
    {
        return Attachment::query()->where('nscmf_record_id', $recordId)->whereNull('removed_at')
            ->where('security_status', SecurityStatus::CLEAN->value)->count();
    }

    public function findResumableSession(int $recordId, int $userId, string $filename, int $size, ?string $fingerprint): ?UploadSession
    {
        return UploadSession::query()
            ->where('nscmf_record_id', $recordId)
            ->where('initiated_by_user_id', $userId)
            ->where('original_filename', $filename)
            ->where('expected_size_bytes', $size)
            ->where('client_fingerprint_sha256', $fingerprint)
            ->where('upload_status', UploadStatus::UPLOADING->value)
            ->where('expires_at', '>', CarbonImmutable::now())
            ->latest('id')
            ->first();
    }

    public function createSession(array $attributes): UploadSession
    {
        return UploadSession::query()->create($attributes);
    }

    public function findSession(int $recordId, string $publicId): ?UploadSession
    {
        return UploadSession::query()->where('nscmf_record_id', $recordId)->where('public_id', $publicId)->first();
    }

    public function lockSession(int $sessionId): UploadSession
    {
        return UploadSession::query()->lockForUpdate()->findOrFail($sessionId);
    }

    public function updateSession(UploadSession $session, array $attributes): void
    {
        $session->forceFill($attributes)->save();
    }

    public function findChunk(int $sessionId, int $index): ?UploadChunk
    {
        return UploadChunk::query()->where('upload_session_id', $sessionId)->where('chunk_index', $index)->first();
    }

    public function addChunk(array $attributes): ?UploadChunk
    {
        try {
            return UploadChunk::query()->create($attributes);
        } catch (UniqueConstraintViolationException) {
            return null;
        }
    }

    public function createAttachment(array $attributes): Attachment
    {
        return Attachment::query()->create($attributes);
    }

    public function findAttachment(int $recordId, int $attachmentId): ?Attachment
    {
        return Attachment::query()->where('nscmf_record_id', $recordId)->find($attachmentId);
    }

    public function lockAttachment(int $attachmentId): Attachment
    {
        return Attachment::query()->lockForUpdate()->findOrFail($attachmentId);
    }

    public function updateAttachment(Attachment $attachment, array $attributes): void
    {
        $attachment->forceFill($attributes)->save();
    }

    public function listForRecord(int $recordId): array
    {
        return array_values(Attachment::query()->where('nscmf_record_id', $recordId)->whereNull('removed_at')->orderBy('id')->get()->all());
    }

    public function abandonedPending(CarbonImmutable $before, int $limit): array
    {
        return array_values(Attachment::query()
            ->where('security_status', SecurityStatus::PENDING->value)
            ->where('updated_at', '<', $before)
            ->orderBy('id')->limit($limit)->get()->all());
    }

    public function abandonedAssembling(CarbonImmutable $before, int $limit): array
    {
        return array_values(UploadSession::query()
            ->where('upload_status', UploadStatus::ASSEMBLING->value)
            ->where('updated_at', '<', $before)
            ->orderBy('id')->limit($limit)->get()->all());
    }

    public function expiredSessions(CarbonImmutable $now, int $limit): array
    {
        return array_values(UploadSession::query()
            ->where('upload_status', UploadStatus::UPLOADING->value)
            ->where('expires_at', '<=', $now)
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->all());
    }
}
