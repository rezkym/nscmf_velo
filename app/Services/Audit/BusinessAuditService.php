<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use Carbon\CarbonImmutable;

/**
 * Minimum Business Audit writer (T32). It never opens or commits its own transaction: the
 * caller's mutation transaction decides whether the evidence survives (Mutation-01).
 */
final readonly class BusinessAuditService
{
    public function __construct(private BusinessAuditRepository $events) {}

    /**
     * @param  list<array{field_path: string, old: string|null, new: string|null, kind?: string|null}>  $changes
     * @param  array<string, scalar|null>  $metadata
     */
    public function record(
        int $recordId,
        ?int $actorUserId,
        BusinessAuditEvent $event,
        ?int $versionBefore = null,
        ?int $versionAfter = null,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?string $reason = null,
        ?string $comment = null,
        ?int $workflowIterationId = null,
        array $changes = [],
        array $metadata = [],
    ): int {
        return $this->events->appendEvent(
            [
                'nscmf_record_id' => $recordId,
                'workflow_iteration_id' => $workflowIterationId,
                'actor_user_id' => $actorUserId,
                'actor_type' => $actorUserId === null ? 'SYSTEM' : 'USER',
                'event_type' => $event->value,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'reason' => $reason,
                'comment' => $comment,
                'record_version_before' => $versionBefore,
                'record_version_after' => $versionAfter,
                'metadata_json' => $metadata === [] ? null : $metadata,
                'occurred_at' => CarbonImmutable::now(),
            ],
            array_map(fn (array $change): array => [
                'field_path' => $change['field_path'],
                'value_kind' => $change['kind'] ?? null,
                'old_value_text' => $change['old'],
                'new_value_text' => $change['new'],
            ], $changes),
        );
    }
}
