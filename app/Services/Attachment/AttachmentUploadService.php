<?php

declare(strict_types=1);

namespace App\Services\Attachment;

use App\Domain\Attachment\UploadStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Storage\PrivateStorage;
use App\Jobs\FinalizeAttachmentUpload;
use App\Models\Attachment\UploadChunk;
use App\Models\Attachment\UploadSession;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

/**
 * Resumable upload transport (11A, 12 §51–61). MySQL holds progress, private storage holds
 * bytes, and a chunk is accepted only after its bytes are durably written. No byte I/O happens
 * inside a record or session lock.
 */
final readonly class AttachmentUploadService
{
    public function __construct(
        private NscmfRepository $records,
        private AttachmentRepository $attachments,
        private PrivateStorage $storage,
        private DatabaseManager $database,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function initiate(User $actor, int $recordId, string $filename, int $size, ?string $mime, ?string $fingerprint): array
    {
        $record = $this->editableRecord($actor, $recordId);
        $extension = self::extension($filename);
        if (! in_array($extension, config()->array('nscmf.attachments.extensions'), true)) {
            throw new DomainRuleException('ATTACHMENT_TYPE_INVALID', 'This file type is not allowed.', 422);
        }
        if ($size === 0) {
            throw new DomainRuleException('ATTACHMENT_ZERO_BYTE', 'An empty file cannot be attached.', 422);
        }
        if ($size < 0 || $size > config()->integer('nscmf.attachments.max_bytes')) {
            throw new DomainRuleException('ATTACHMENT_SIZE_INVALID', 'A file may be at most 20,000,000 bytes.', 422);
        }

        return $this->database->connection()->transaction(function () use ($actor, $record, $filename, $extension, $size, $mime, $fingerprint): array {
            $this->records->lockForUpdate($record->id);
            $resumable = $this->attachments->findResumableSession($record->id, $actor->id, $filename, $size, $fingerprint);
            if ($resumable !== null) {
                return $this->state($resumable, resumed: true);
            }
            if ($this->attachments->slotsInUse($record->id) >= config()->integer('nscmf.attachments.max_active')) {
                throw new DomainRuleException('ATTACHMENT_LIMIT_REACHED', 'A record may have at most 10 attachments.', 409);
            }

            $chunkBytes = config()->integer('nscmf.attachments.chunk_bytes');
            $now = CarbonImmutable::now();
            $session = $this->attachments->createSession([
                'public_id' => Str::lower((string) Str::ulid()),
                'nscmf_record_id' => $record->id,
                'initiated_by_user_id' => $actor->id,
                'original_filename' => $filename,
                'normalized_extension' => $extension,
                'client_declared_mime' => $mime,
                'expected_size_bytes' => $size,
                'chunk_size_bytes' => $chunkBytes,
                'expected_chunk_count' => intdiv($size + $chunkBytes - 1, $chunkBytes),
                'client_fingerprint_sha256' => $fingerprint,
                'upload_status' => UploadStatus::UPLOADING,
                'last_activity_at' => $now,
                'expires_at' => self::expiry($now),
            ]);

            return $this->state($session, resumed: false);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function status(User $actor, int $recordId, string $uploadId): array
    {
        return $this->state($this->ownSession($actor, $this->visibleRecord($actor, $recordId), $uploadId));
    }

    /**
     * @param  resource  $body
     * @return array<string, mixed>
     */
    public function acceptChunk(User $actor, int $recordId, string $uploadId, int $index, mixed $body): array
    {
        $session = $this->ownSession($actor, $this->editableRecord($actor, $recordId), $uploadId);
        $this->assertUploading($session);
        if ($index < 1 || $index > $session->expected_chunk_count) {
            throw new DomainRuleException('UPLOAD_CHUNK_INVALID', 'The chunk index is outside this upload.', 422);
        }

        // Buffer the (at most 5 MiB) chunk to learn its length and hash before anything is stored.
        $buffer = fopen('php://temp', 'w+b');
        if ($buffer === false) {
            throw new \RuntimeException('Could not buffer the chunk.');
        }
        $size = (int) stream_copy_to_stream($body, $buffer, $session->expectedChunkBytes($index) + 1);
        if ($size !== $session->expectedChunkBytes($index)) {
            fclose($buffer);
            throw new DomainRuleException('UPLOAD_CHUNK_INVALID', 'The chunk size does not match this upload.', 422);
        }
        rewind($buffer);
        $hash = hash_init('sha256');
        hash_update_stream($hash, $buffer);
        $sha256 = hash_final($hash);

        $existing = $this->attachments->findChunk($session->id, $index);
        if ($existing !== null) {
            fclose($buffer);

            return $this->duplicateOrConflict($session, $existing, $sha256);
        }

        rewind($buffer);
        $key = $this->storage->write(PrivateStorage::CHUNKS, $buffer);
        fclose($buffer);

        $accepted = $this->database->connection()->transaction(function () use ($session, $index, $size, $key, $sha256): bool {
            $locked = $this->attachments->lockSession($session->id);
            $this->assertUploading($locked);
            $now = CarbonImmutable::now();
            $chunk = $this->attachments->addChunk([
                'upload_session_id' => $locked->id, 'chunk_index' => $index, 'size_bytes' => $size,
                'storage_key' => $key, 'chunk_sha256' => $sha256, 'accepted_at' => $now,
            ]);
            if ($chunk !== null) {
                $this->attachments->updateSession($locked, ['last_activity_at' => $now, 'expires_at' => self::expiry($now)]);
            }

            return $chunk !== null;
        });

        if (! $accepted) {
            // Another request accepted this index first; our bytes were never acknowledged.
            $this->storage->delete($key);
            $existing = $this->attachments->findChunk($session->id, $index) ?? throw new \LogicException('Accepted chunk vanished.');

            return $this->duplicateOrConflict($session, $existing, $sha256);
        }

        return [...$this->state($session->refresh()), 'chunk_index' => $index, 'duplicate' => false];
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(User $actor, int $recordId, string $uploadId): array
    {
        $session = $this->ownSession($actor, $this->visibleRecord($actor, $recordId), $uploadId);

        $this->database->connection()->transaction(function () use ($session): void {
            $locked = $this->attachments->lockSession($session->id);
            if ($locked->upload_status !== UploadStatus::UPLOADING) {
                throw new DomainRuleException('UPLOAD_SESSION_STATE_CONFLICT', 'This upload can no longer be cancelled.', 409);
            }
            $this->attachments->updateSession($locked, ['upload_status' => UploadStatus::CANCELLED]);
        });
        $this->discardChunks($session);

        return $this->state($session->refresh());
    }

    /**
     * Verifies the complete chunk set and hands finalization to the queue after commit (12 §56).
     *
     * @return array<string, mixed>
     */
    public function complete(User $actor, int $recordId, string $uploadId): array
    {
        $session = $this->ownSession($actor, $this->editableRecord($actor, $recordId), $uploadId);

        $this->database->connection()->transaction(function () use ($session): void {
            $locked = $this->attachments->lockSession($session->id);
            $this->assertUploading($locked);
            $chunks = $locked->chunks;
            $complete = $chunks->count() === $locked->expected_chunk_count
                && $chunks->sum(fn (UploadChunk $chunk): int => $chunk->size_bytes) === $locked->expected_size_bytes;
            if (! $complete) {
                throw new DomainRuleException('UPLOAD_INCOMPLETE', 'Some chunks have not been uploaded yet.', 409, ['missing_chunks' => self::missing($locked)]);
            }
            $this->attachments->updateSession($locked, ['upload_status' => UploadStatus::ASSEMBLING]);
            FinalizeAttachmentUpload::dispatch($locked->id)->afterCommit();
        });

        return $this->state($session->refresh());
    }

    /** Deletes the bytes of an unfinished session's accepted chunks; their metadata stays. */
    public function discardChunks(UploadSession $session): void
    {
        foreach ($session->chunks as $chunk) {
            $this->storage->delete($chunk->storage_key);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function state(UploadSession $session, ?bool $resumed = null): array
    {
        $session->loadMissing('chunks', 'attachment');

        return array_filter([
            'upload_id' => $session->public_id,
            'resumed' => $resumed,
            'status' => $session->upload_status->value,
            'filename' => $session->original_filename,
            'size_bytes' => $session->expected_size_bytes,
            'chunk_size' => $session->chunk_size_bytes,
            'chunk_count' => $session->expected_chunk_count,
            'accepted_chunks' => $session->chunks->map(fn (UploadChunk $chunk): int => $chunk->chunk_index)->values()->all(),
            'missing_chunks' => self::missing($session),
            'expires_at' => $session->expires_at->toIso8601String(),
            'failure_code' => $session->failure_code,
            'attachment' => $session->attachment === null ? null : [
                'id' => $session->attachment->id,
                'security_status' => $session->attachment->security_status->value,
            ],
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @return array<string, mixed>
     */
    private function duplicateOrConflict(UploadSession $session, UploadChunk $existing, string $sha256): array
    {
        if ($existing->chunk_sha256 !== $sha256) {
            throw new DomainRuleException('UPLOAD_CHUNK_CONFLICT', 'Different bytes were already accepted for this chunk.', 409);
        }

        return [...$this->state($session), 'chunk_index' => $existing->chunk_index, 'duplicate' => true];
    }

    private function assertUploading(UploadSession $session): void
    {
        if ($session->upload_status === UploadStatus::UPLOADING && $session->expires_at->isPast()) {
            $this->attachments->updateSession($session, ['upload_status' => UploadStatus::EXPIRED]);
        }
        if ($session->upload_status === UploadStatus::EXPIRED) {
            throw new DomainRuleException('UPLOAD_SESSION_EXPIRED', 'This upload expired. Start it again.', 410);
        }
        if ($session->upload_status !== UploadStatus::UPLOADING) {
            throw new DomainRuleException('UPLOAD_SESSION_STATE_CONFLICT', 'This upload no longer accepts chunks.', 409);
        }
    }

    private function ownSession(User $actor, NscmfRecord $record, string $uploadId): UploadSession
    {
        $session = $this->attachments->findSession($record->id, $uploadId);
        if ($session === null || $session->initiated_by_user_id !== $actor->id) {
            throw DomainRuleException::notFound();
        }

        return $session;
    }

    private function visibleRecord(User $actor, int $recordId): NscmfRecord
    {
        $record = $this->records->find($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can('nscmf.attachment.manage') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
            throw DomainRuleException::forbidden();
        }

        return $record;
    }

    /** Attachments change only in the owner's DRAFT/REVISION_REQUIRED, unarchived (06 §53). */
    private function editableRecord(User $actor, int $recordId): NscmfRecord
    {
        $record = $this->visibleRecord($actor, $recordId);
        if ($record->is_archived || ! $record->business_status->allowsDraftEdit()) {
            throw new DomainRuleException('NSCMF_STATE_CONFLICT', 'Attachments can only change while the record is editable.', 409);
        }

        return $record;
    }

    /**
     * @return list<int>
     */
    private static function missing(UploadSession $session): array
    {
        $accepted = $session->chunks->map(fn (UploadChunk $chunk): int => $chunk->chunk_index)->all();

        return array_values(array_diff(range(1, $session->expected_chunk_count), $accepted));
    }

    private static function extension(string $filename): string
    {
        return Str::lower(pathinfo($filename, PATHINFO_EXTENSION));
    }

    private static function expiry(CarbonImmutable $from): CarbonImmutable
    {
        return $from->addHours(config()->integer('nscmf.attachments.inactivity_hours'));
    }
}
