<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Minimum Security Audit writer (T35). Metadata that could carry a credential or secret is
 * refused outright rather than silently stored (11 §5.2, 10 §8).
 */
final readonly class SecurityAuditService
{
    private const array FORBIDDEN_METADATA_FRAGMENTS = ['password', 'token', 'secret', 'passphrase', 'private_key'];

    public function __construct(private SecurityAuditRepository $events) {}

    /**
     * @param  array<string, scalar|null|list<scalar>>  $metadata
     */
    public function record(
        SecurityAuditEvent $event,
        SecurityAuditOutcome $outcome,
        ?int $actorUserId = null,
        ?int $targetUserId = null,
        ?string $subjectUsername = null,
        ?string $sessionId = null,
        ?string $ipAddress = null,
        ?int $recordId = null,
        array $metadata = [],
        ?int $attachmentId = null,
        ?int $exportRequestId = null,
    ): int {
        foreach (array_keys($metadata) as $key) {
            foreach (self::FORBIDDEN_METADATA_FRAGMENTS as $fragment) {
                if (str_contains(strtolower($key), $fragment)) {
                    throw new InvalidArgumentException("Security Audit metadata may not carry [{$key}].");
                }
            }
        }

        return $this->events->appendEvent([
            'actor_user_id' => $actorUserId,
            'target_user_id' => $targetUserId,
            'subject_username' => $subjectUsername === null ? null : mb_substr($subjectUsername, 0, 150),
            'event_type' => $event->value,
            'outcome' => $outcome->value,
            'session_id' => $sessionId,
            'ip_address' => $ipAddress,
            'nscmf_record_id' => $recordId,
            'attachment_id' => $attachmentId,
            'export_request_id' => $exportRequestId,
            'metadata_json' => $metadata === [] ? null : $metadata,
            'occurred_at' => CarbonImmutable::now(),
        ]);
    }
}
