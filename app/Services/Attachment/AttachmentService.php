<?php

declare(strict_types=1);

namespace App\Services\Attachment;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\RecordConflict;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Storage\PrivateStorage;
use App\Models\Attachment\Attachment;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\AccessAuditService;
use App\Services\Audit\BusinessAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use RuntimeException;

/**
 * Final attachments (12 §59, §62–63): safe metadata, CLEAN-only download and logical removal.
 * A storage locator never authorizes; the parent record's authorization always does.
 */
final readonly class AttachmentService
{
    private const array READ_PERMISSIONS = ['nscmf.view', 'nscmf.review', 'nscmf.approve', 'nscmf.view.history'];

    public function __construct(
        private NscmfRepository $records,
        private AttachmentRepository $attachments,
        private PrivateStorage $storage,
        private AccessAuditService $accessAudit,
        private BusinessAuditService $businessAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * The locked upload limits the editor needs (06 §50–51, 12 §54). Server rules still decide.
     *
     * @return array<string, mixed>
     */
    public static function policy(): array
    {
        return [
            'max_files' => config()->integer('nscmf.attachments.max_active'),
            'max_bytes' => config()->integer('nscmf.attachments.max_bytes'),
            'chunk_bytes' => config()->integer('nscmf.attachments.chunk_bytes'),
            'extensions' => config()->array('nscmf.attachments.extensions'),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function list(User $actor, int $recordId): array
    {
        $this->readableRecord($actor, $recordId);

        return array_map(self::project(...), $this->attachments->listForRecord($recordId));
    }

    /** @return array<string, mixed> */
    public function show(User $actor, int $recordId, int $attachmentId): array
    {
        $this->readableRecord($actor, $recordId);
        $attachment = $this->attachments->findAttachment($recordId, $attachmentId) ?? throw DomainRuleException::notFound();
        if ($attachment->removed_at !== null) {
            throw new DomainRuleException('ATTACHMENT_REMOVED', 'This attachment was removed.', 410);
        }
        $this->accessAudit->record($actor->id, AccessAuditEvent::ATTACHMENT_VIEWED, $recordId, $attachment->id);

        return self::project($attachment);
    }

    /** @return array{stream: resource, filename: string} */
    public function download(User $actor, int $recordId, int $attachmentId): array
    {
        $this->readableRecord($actor, $recordId);
        $attachment = $this->attachments->findAttachment($recordId, $attachmentId);
        if ($attachment === null || $attachment->removed_at !== null) {
            throw DomainRuleException::notFound();
        }
        if (! $attachment->isDownloadable() || $attachment->private_object_key === null) {
            throw new DomainRuleException('ATTACHMENT_NOT_CLEAN', 'This attachment is not available for download.', 409);
        }
        try {
            $stream = $this->storage->readStream($attachment->private_object_key);
        } catch (RuntimeException) {
            throw DomainRuleException::notFound();
        }
        $this->accessAudit->record($actor->id, AccessAuditEvent::ATTACHMENT_DOWNLOADED, $recordId, $attachment->id);

        return ['stream' => $stream, 'filename' => self::safeFilename($attachment->original_filename)];
    }

    /** Logical removal: metadata and history stay; the record version moves once (BE-100). */
    public function remove(User $actor, int $recordId, int $attachmentId): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $attachmentId): void {
            $record = $this->records->lockForUpdate($recordId);
            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
                throw DomainRuleException::notFound();
            }
            if (! $actor->can('nscmf.attachment.manage') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }
            if ($record->is_archived || ! $record->business_status->allowsDraftEdit()) {
                throw RecordConflict::state($record, 'Attachments can only change while the record is editable.');
            }
            $attachment = $this->attachments->findAttachment($recordId, $attachmentId);
            if ($attachment === null || $attachment->removed_at !== null) {
                throw DomainRuleException::notFound();
            }

            $this->attachments->updateAttachment($this->attachments->lockAttachment($attachment->id), [
                'removed_at' => CarbonImmutable::now(),
                'removed_by_user_id' => $actor->id,
            ]);
            $versionBefore = $record->record_version;
            $this->records->updateAndIncrementVersion($record, []);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::ATTACHMENT_REMOVED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                workflowIterationId: $record->current_workflow_iteration_id,
                metadata: ['attachment_id' => $attachment->id, 'filename' => $attachment->original_filename],
            );
        });
    }

    private function readableRecord(User $actor, int $recordId): NscmfRecord
    {
        $record = $this->records->find($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }
        if (! array_any(self::READ_PERMISSIONS, fn (string $permission): bool => $actor->can($permission))) {
            throw DomainRuleException::forbidden();
        }

        return $record;
    }

    /** @return array<string, mixed> */
    private static function project(Attachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'filename' => $attachment->original_filename,
            'size_bytes' => $attachment->size_bytes,
            'security_status' => $attachment->security_status->value,
            'scanned_at' => $attachment->scanned_at?->toIso8601String(),
            'created_at' => $attachment->created_at->toIso8601String(),
            'download_url' => $attachment->isDownloadable()
                ? "/nscmf/{$attachment->nscmf_record_id}/attachments/{$attachment->id}/download" : null,
        ];
    }

    private static function safeFilename(string $filename): string
    {
        $name = str_replace(["\r", "\n", "\0"], '', basename(str_replace('\\', '/', $filename)));

        return $name === '' ? 'attachment' : $name;
    }
}
