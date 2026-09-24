<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Repositories\Contracts\Security\SessionRepository;
use App\Services\Audit\SecurityAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Session\Session;

/**
 * Authenticated-session lifecycle (10 §16–22): 30-minute idle (framework session lifetime),
 * 8-hour absolute anchor, at most two active sessions, server-side revocation.
 */
final readonly class SessionService
{
    public const string ANCHOR_KEY = 'nscmf.authenticated_at';

    public function __construct(
        private SessionRepository $sessions,
        private SecurityAuditService $securityAudit,
    ) {}

    public function anchor(Session $session): void
    {
        $session->put(self::ANCHOR_KEY, CarbonImmutable::now()->getTimestamp());
    }

    /** No anchor, or an anchor at least eight hours old, fails closed as expired. */
    public function isExpired(Session $session): bool
    {
        $anchor = $session->get(self::ANCHOR_KEY);

        return ! is_int($anchor)
            || CarbonImmutable::now()->getTimestamp() - $anchor >= config()->integer('security.session.absolute_lifetime_seconds');
    }

    /**
     * Called right after a successful login, before the new session row is written: keeps at most
     * (limit - 1) other active sessions so the new one brings the total to the limit, revoking the
     * oldest deterministically.
     */
    public function enforceActiveLimit(int $userId, string $currentSessionId, ?string $ipAddress): void
    {
        $others = $this->sessions->activeAuthenticatedSessionIds(
            $userId,
            CarbonImmutable::now()->subSeconds(config()->integer('security.session.absolute_lifetime_seconds')),
            CarbonImmutable::now()->subMinutes(config()->integer('session.lifetime'))->getTimestamp(),
            $currentSessionId,
        );

        $excess = count($others) - (config()->integer('security.session.max_active_sessions') - 1);

        if ($excess <= 0) {
            return;
        }

        $revoked = array_slice($others, 0, $excess);
        $this->sessions->delete($revoked);

        foreach ($revoked as $sessionId) {
            $this->securityAudit->record(
                event: SecurityAuditEvent::SESSION_REVOKED,
                outcome: SecurityAuditOutcome::SUCCESS,
                targetUserId: $userId,
                sessionId: $sessionId,
                ipAddress: $ipAddress,
                metadata: ['reason' => 'MAX_ACTIVE_SESSIONS'],
            );
        }
    }

    /** Server-side revocation of every session of a user (10 §22). */
    public function revokeAllForUser(int $userId, ?string $exceptSessionId = null): int
    {
        return $this->sessions->deleteAllForUser($userId, $exceptSessionId);
    }
}
