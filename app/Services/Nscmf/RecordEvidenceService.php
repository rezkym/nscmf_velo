<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Shared\DomainRuleException;
use App\Models\Audit\BusinessAuditChangeRecord;
use App\Models\Audit\BusinessAuditEventRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;

/** The read-only Business Timeline (12 §48): business mutations only, never access evidence. */
final readonly class RecordEvidenceService
{
    public function __construct(
        private NscmfRepository $records,
        private RecordEvidenceRepository $evidence,
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
                'attachment_filename' => self::attachmentFilename($event),
                'changes' => $event->changes->map(static fn (BusinessAuditChangeRecord $change): array => [
                    'field' => $change->field_path, 'before' => $change->old_value_text, 'after' => $change->new_value_text,
                ])->values()->all(),
            ], $events->items()),
            'meta' => ['current_page' => $events->currentPage(), 'last_page' => $events->lastPage(), 'per_page' => $events->perPage(), 'total' => $events->total()],
        ];
    }

    /** The file an attachment event added or removed, as its audit recorded it (07 §36). */
    private static function attachmentFilename(BusinessAuditEventRecord $event): ?string
    {
        $attachmentEvents = [BusinessAuditEvent::ATTACHMENT_ADDED->value, BusinessAuditEvent::ATTACHMENT_REMOVED->value];
        $filename = $event->metadata_json['filename'] ?? null;

        return in_array($event->event_type, $attachmentEvents, true) && is_string($filename) ? $filename : null;
    }

    /** @param list<string> $permissions */
    private function authorizeRecord(User $actor, int $recordId, array $permissions): void
    {
        $record = $this->records->find($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
            throw DomainRuleException::notFound();
        }
        if (! array_any($permissions, fn (string $permission): bool => $actor->can($permission))) {
            throw DomainRuleException::forbidden();
        }
    }
}
