<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Attachment;

use App\Models\Attachment\Attachment;
use App\Models\Attachment\UploadChunk;
use App\Models\Attachment\UploadSession;
use Carbon\CarbonImmutable;

interface AttachmentRepository
{
    /** Non-removed attachments that are CLEAN or still being scanned, plus open upload sessions. */
    public function slotsInUse(int $recordId): int;

    public function cleanCount(int $recordId): int;

    /** An unexpired UPLOADING session of the same actor, file name, size and fingerprint. */
    public function findResumableSession(int $recordId, int $userId, string $filename, int $size, ?string $fingerprint): ?UploadSession;

    /** @param array<string, mixed> $attributes */
    public function createSession(array $attributes): UploadSession;

    public function findSession(int $recordId, string $publicId): ?UploadSession;

    public function lockSession(int $sessionId): UploadSession;

    /** @param array<string, mixed> $attributes */
    public function updateSession(UploadSession $session, array $attributes): void;

    public function findChunk(int $sessionId, int $index): ?UploadChunk;

    /**
     * Inserts the accepted chunk; returns null when the index was accepted concurrently.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function addChunk(array $attributes): ?UploadChunk;

    /** @param array<string, mixed> $attributes */
    public function createAttachment(array $attributes): Attachment;

    public function findAttachment(int $recordId, int $attachmentId): ?Attachment;

    public function lockAttachment(int $attachmentId): Attachment;

    /** @param array<string, mixed> $attributes */
    public function updateAttachment(Attachment $attachment, array $attributes): void;

    /** @return list<Attachment> */
    public function listForRecord(int $recordId): array;

    /**
     * PENDING attachments still in quarantine since before $before: their scan never finished.
     *
     * @return list<Attachment>
     */
    public function abandonedPending(CarbonImmutable $before, int $limit): array;

    /**
     * ASSEMBLING sessions untouched since before $before: their finalization job died.
     *
     * @return list<UploadSession>
     */
    public function abandonedAssembling(CarbonImmutable $before, int $limit): array;

    /**
     * Unfinished sessions whose inactivity window has passed.
     *
     * @return list<UploadSession>
     */
    public function expiredSessions(CarbonImmutable $now, int $limit): array;
}
