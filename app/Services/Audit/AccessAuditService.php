<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Repositories\Contracts\Audit\AccessAuditRepository;
use Carbon\CarbonImmutable;

/** Minimum Access Audit writer (T34); routine access never becomes Business Timeline. */
final readonly class AccessAuditService
{
    public function __construct(private AccessAuditRepository $events) {}

    public function record(int $actorUserId, AccessAuditEvent $event, ?int $recordId = null, ?int $attachmentId = null, ?int $exportRequestId = null): int
    {
        return $this->events->appendEvent([
            'actor_user_id' => $actorUserId,
            'event_type' => $event->value,
            'nscmf_record_id' => $recordId,
            'attachment_id' => $attachmentId,
            'export_request_id' => $exportRequestId,
            'occurred_at' => CarbonImmutable::now(),
        ]);
    }
}
