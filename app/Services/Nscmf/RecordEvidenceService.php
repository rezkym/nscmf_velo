<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Shared\DomainRuleException;
use App\Models\Audit\BusinessAuditChangeRecord;
use App\Models\Audit\BusinessAuditEventRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use App\Services\Audit\AccessAuditService;
use Illuminate\Contracts\Filesystem\Factory;
use League\Flysystem\UnableToReadFile;

/** Read-only evidence for record detail; no upload, removal, or malware-state mutation. */
final readonly class RecordEvidenceService
{
    public function __construct(
        private NscmfRepository $records,
        private RecordEvidenceRepository $evidence,
        private AccessAuditService $accessAudit,
        private Factory $storage,
    ) {}

    /** @return array<string, mixed> */
    public function timeline(User $actor, int $recordId, int $page, int $perPage): array
    {
        $this->authorizeRecord($actor, $recordId, ['nscmf.timeline.view']);
        $events = $this->evidence->timeline($recordId, $page, $perPage);

        return [
            'data' => array_map(static fn (BusinessAuditEventRecord $event): array => [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'actor' => $event->actor_type === 'SYSTEM' ? 'System' : $event->actor?->name,
                'iteration_no' => $event->iteration?->iteration_no,
                'from_status' => $event->from_status,
                'to_status' => $event->to_status,
                'reason' => $event->reason,
                'comment' => $event->comment,
                'version_before' => $event->record_version_before,
                'version_after' => $event->record_version_after,
                'occurred_at' => $event->occurred_at->toIso8601String(),
                'changes' => $event->changes->map(static fn (BusinessAuditChangeRecord $change): array => [
                    'field' => $change->field_path, 'before' => $change->old_value_text, 'after' => $change->new_value_text,
                ])->values()->all(),
            ], $events->items()),
            'meta' => ['current_page' => $events->currentPage(), 'last_page' => $events->lastPage(), 'per_page' => $events->perPage(), 'total' => $events->total()],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function attachments(User $actor, int $recordId): array
    {
        $this->authorizeRecord($actor, $recordId, self::readPermissions());

        return array_map(static fn (\stdClass $attachment): array => [
            'id' => (int) $attachment->id, 'filename' => $attachment->original_filename,
            'size_bytes' => (int) $attachment->size_bytes, 'security_status' => $attachment->security_status,
            'download_url' => $attachment->security_status === 'CLEAN' && $attachment->scanned_at !== null
                ? "/nscmf/{$recordId}/attachments/{$attachment->id}/download" : null,
        ], $this->evidence->attachments($recordId));
    }

    /** @return array{stream: resource, filename: string} */
    public function download(User $actor, int $recordId, int $attachmentId): array
    {
        $this->authorizeRecord($actor, $recordId, self::readPermissions());
        $attachment = $this->evidence->attachment($recordId, $attachmentId);
        if ($attachment === null) {
            throw DomainRuleException::notFound();
        }
        if ($attachment->security_status !== 'CLEAN' || $attachment->scanned_at === null) {
            throw new DomainRuleException('ATTACHMENT_NOT_CLEAN', 'This attachment is not available for download.', 409);
        }
        $key = $attachment->private_object_key;
        if (! is_string($key) || $key === '' || str_starts_with($key, '/') || str_contains($key, '..') || str_contains($key, '\\')) {
            throw DomainRuleException::notFound();
        }
        try {
            $stream = $this->storage->disk('nscmf_private')->readStream($key);
        } catch (UnableToReadFile) {
            throw DomainRuleException::notFound();
        }
        if (! is_resource($stream)) {
            throw DomainRuleException::notFound();
        }
        try {
            $this->accessAudit->record($actor->id, AccessAuditEvent::ATTACHMENT_DOWNLOADED, $recordId, $attachmentId);
        } catch (\Throwable $exception) {
            fclose($stream);
            throw $exception;
        }
        $filename = is_string($attachment->original_filename) ? basename(str_replace('\\', '/', $attachment->original_filename)) : 'attachment';

        return ['stream' => $stream, 'filename' => str_replace(["\r", "\n", "\0"], '', $filename) ?: 'attachment'];
    }

    /** @param list<string> $permissions */
    private function authorizeRecord(User $actor, int $recordId, array $permissions): void
    {
        $record = $this->records->find($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }
        if (! array_any($permissions, fn (string $permission): bool => $actor->can($permission))) {
            throw DomainRuleException::forbidden();
        }
    }

    /** @return list<string> */
    private static function readPermissions(): array
    {
        return ['nscmf.view', 'nscmf.review', 'nscmf.approve', 'nscmf.view.history'];
    }
}
