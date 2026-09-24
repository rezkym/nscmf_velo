<?php

declare(strict_types=1);

namespace App\Services\Attachment;

use App\Domain\Attachment\ScanVerdict;
use App\Domain\Attachment\SecurityStatus;
use App\Domain\Attachment\UploadStatus;
use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Infrastructure\Malware\MalwareScanner;
use App\Infrastructure\Malware\ScannerUnavailable;
use App\Infrastructure\Storage\PrivateStorage;
use App\Models\Attachment\Attachment;
use App\Models\Attachment\UploadSession;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\BusinessAuditService;
use App\Services\Audit\SecurityAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;

/**
 * Server-side finalization (11A §15–18): private assembly, authoritative SHA-256, type check,
 * whole-file scan, and promotion only on explicit CLEAN with the parent rechecked under lock.
 * Every other outcome fails closed and leaves no usable file.
 */
final readonly class AttachmentFinalizationService
{
    /** Detected types accepted per extension, where detection is reliable (06 §51). */
    private const array MIME_TYPES = [
        'pdf' => ['application/pdf'],
        'png' => ['image/png'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'doc' => ['application/msword', 'application/vnd.ms-office', 'application/CDFV2', 'application/x-ole-storage'],
        'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/CDFV2', 'application/x-ole-storage'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
        'txt' => ['text/plain'],
        'csv' => ['text/plain', 'text/csv', 'application/csv'],
    ];

    public function __construct(
        private AttachmentRepository $attachments,
        private UserRepository $users,
        private NscmfRepository $records,
        private PrivateStorage $storage,
        private MalwareScanner $scanner,
        private BusinessAuditService $businessAudit,
        private SecurityAuditService $securityAudit,
        private AttachmentUploadService $uploads,
        private DatabaseManager $database,
    ) {}

    public function finalize(int $sessionId): void
    {
        $session = $this->attachments->lockSession($sessionId);
        $attachment = match ($session->upload_status) {
            UploadStatus::ASSEMBLING => $this->assemble($session),
            // A retried job resumes at the scan step for an assembled, still-pending file.
            UploadStatus::COMPLETED => $session->attachment?->security_status === SecurityStatus::PENDING ? $session->attachment : null,
            default => null,
        };

        if ($attachment !== null) {
            $this->scanAndPromote($session, $attachment);
        }
    }

    public function markFailed(int $sessionId, string $failureCode): void
    {
        $session = $this->attachments->lockSession($sessionId);
        if ($session->upload_status === UploadStatus::ASSEMBLING) {
            $this->attachments->updateSession($session, ['upload_status' => UploadStatus::FAILED, 'failure_code' => $failureCode]);
        }
        if ($session->attachment?->security_status === SecurityStatus::PENDING) {
            $this->discardAttachment($session->attachment, SecurityStatus::FAILED);
        }
    }

    private function assemble(UploadSession $session): ?Attachment
    {
        $assembled = fopen('php://temp/maxmemory:1048576', 'w+b');
        if ($assembled === false) {
            throw new \RuntimeException('Could not open the assembly buffer.');
        }
        $hash = hash_init('sha256');
        foreach ($session->chunks as $chunk) {
            $bytes = $this->storage->readStream($chunk->storage_key);
            $content = (string) stream_get_contents($bytes);
            fclose($bytes);
            if (hash('sha256', $content) !== $chunk->chunk_sha256) {
                fclose($assembled);
                $this->attachments->updateSession($session, ['upload_status' => UploadStatus::FAILED, 'failure_code' => 'UPLOAD_INTEGRITY_FAILED']);
                $this->uploads->discardChunks($session);

                return null;
            }
            hash_update($hash, $content);
            fwrite($assembled, $content);
        }

        $size = (int) ftell($assembled);
        rewind($assembled);
        $key = $this->storage->write(PrivateStorage::QUARANTINE, $assembled);
        fclose($assembled);

        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($this->storage->localPath($key));
        if ($size !== $session->expected_size_bytes || ! in_array($mime, self::MIME_TYPES[$session->normalized_extension] ?? [], true)) {
            $this->storage->delete($key);
            $this->attachments->updateSession($session, ['upload_status' => UploadStatus::FAILED, 'failure_code' => 'UPLOAD_INTEGRITY_FAILED']);
            $this->uploads->discardChunks($session);

            return null;
        }

        return $this->database->connection()->transaction(function () use ($session, $key, $size, $mime, $hash): Attachment {
            $attachment = $this->attachments->createAttachment([
                'nscmf_record_id' => $session->nscmf_record_id,
                'uploaded_by_user_id' => $session->initiated_by_user_id,
                'original_filename' => $session->original_filename,
                'extension' => $session->normalized_extension,
                'detected_mime_type' => $mime,
                'size_bytes' => $size,
                'sha256' => hash_final($hash),
                'quarantine_object_key' => $key,
                'security_status' => SecurityStatus::PENDING,
            ]);
            $this->attachments->updateSession($session, [
                'upload_status' => UploadStatus::COMPLETED,
                'assembly_storage_key' => $key,
                'attachment_id' => $attachment->id,
            ]);
            $this->uploads->discardChunks($session);

            return $attachment;
        });
    }

    private function scanAndPromote(UploadSession $session, Attachment $attachment): void
    {
        $quarantineKey = $attachment->quarantine_object_key ?? throw new \LogicException('Pending attachment has no quarantine object.');
        $stream = $this->storage->readStream($quarantineKey);
        try {
            $verdict = $this->scanner->scan($stream);
        } catch (ScannerUnavailable) {
            $this->scanFailed($session, $attachment, SecurityAuditEvent::MALWARE_SCAN_FAILED, SecurityAuditOutcome::ERROR, SecurityStatus::FAILED);

            return;
        } finally {
            fclose($stream);
        }

        if ($verdict === ScanVerdict::INFECTED) {
            $this->scanFailed($session, $attachment, SecurityAuditEvent::MALWARE_DETECTED, SecurityAuditOutcome::DENIED, SecurityStatus::INFECTED);

            return;
        }

        $this->promote($session, $attachment, $quarantineKey);
    }

    /** CLEAN promotion rechecks owner, state, archive and the 10-file limit under the record lock (BE-098). */
    private function promote(UploadSession $session, Attachment $attachment, string $quarantineKey): void
    {
        $promoted = $this->database->connection()->transaction(function () use ($session, $attachment, $quarantineKey): bool {
            $record = $this->records->lockForUpdate($attachment->nscmf_record_id) ?? throw new \LogicException('Attachment parent vanished.');
            $owner = $this->users->findById($session->initiated_by_user_id);
            $eligible = $owner !== null && $owner->is_active && $owner->can('nscmf.attachment.manage')
                && $record->owner_user_id === $owner->id && ! $record->is_archived && $record->business_status->allowsDraftEdit()
                && $this->attachments->cleanCount($record->id) < config()->integer('nscmf.attachments.max_active');
            if (! $eligible) {
                return false;
            }

            $finalKey = $this->storage->move($quarantineKey, PrivateStorage::ATTACHMENTS);
            $this->attachments->updateAttachment($attachment, [
                'security_status' => SecurityStatus::CLEAN,
                'private_object_key' => $finalKey,
                'quarantine_object_key' => null,
                'scanned_at' => CarbonImmutable::now(),
                'scanner_engine' => $this->scanner->engine(),
            ]);
            $versionBefore = $record->record_version;
            $this->records->updateAndIncrementVersion($record, []);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $owner->id,
                event: BusinessAuditEvent::ATTACHMENT_ADDED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                workflowIterationId: $record->current_workflow_iteration_id,
                metadata: ['attachment_id' => $attachment->id, 'filename' => $attachment->original_filename, 'sha256' => $attachment->sha256],
            );

            return true;
        });

        if (! $promoted) {
            // The record left its editable state (or filled up) while scanning: never attach.
            $this->attachments->updateSession($session, ['failure_code' => 'ATTACHMENT_PARENT_LOCKED']);
            $this->discardAttachment($attachment, SecurityStatus::FAILED);
        }
    }

    private function scanFailed(UploadSession $session, Attachment $attachment, SecurityAuditEvent $event, SecurityAuditOutcome $outcome, SecurityStatus $status): void
    {
        $this->database->connection()->transaction(function () use ($session, $attachment, $event, $outcome, $status): void {
            $this->discardAttachment($attachment, $status);
            $this->securityAudit->record(
                event: $event,
                outcome: $outcome,
                actorUserId: $session->initiated_by_user_id,
                recordId: $attachment->nscmf_record_id,
                attachmentId: $attachment->id,
                metadata: ['engine' => $this->scanner->engine()],
            );
        });
    }

    private function discardAttachment(Attachment $attachment, SecurityStatus $status): void
    {
        if ($attachment->quarantine_object_key !== null) {
            $this->storage->delete($attachment->quarantine_object_key);
        }
        $this->attachments->updateAttachment($attachment, [
            'security_status' => $status,
            'quarantine_object_key' => null,
            'scanned_at' => $status === SecurityStatus::INFECTED ? CarbonImmutable::now() : null,
            'scanner_engine' => $status === SecurityStatus::INFECTED ? $this->scanner->engine() : null,
        ]);
    }
}
