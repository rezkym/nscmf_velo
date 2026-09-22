<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Services\Audit\SecurityAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Current-password re-authentication (10 §23–26). The proof is a server-side session
 * timestamp; nothing reusable is returned to the browser.
 */
final readonly class CredentialService
{
    public const string REAUTH_KEY = 'nscmf.reauthenticated_at';

    public function __construct(private SecurityAuditService $securityAudit) {}

    public function reauthenticate(User $user, string $currentPassword, Session $session, ?string $ipAddress): void
    {
        $throttleKey = 'reauth:'.$user->id;

        if (RateLimiter::tooManyAttempts($throttleKey, config()->integer('security.reauthentication_throttle.max_attempts'))) {
            throw new DomainRuleException('RATE_LIMITED', 'Too many attempts. Try again in a minute.', 429);
        }

        if (! Hash::check($currentPassword, $user->password)) {
            RateLimiter::hit($throttleKey, config()->integer('security.reauthentication_throttle.decay_seconds'));
            $session->forget(self::REAUTH_KEY);
            $this->securityAudit->record(
                event: SecurityAuditEvent::REAUTH_FAILED,
                outcome: SecurityAuditOutcome::FAILURE,
                actorUserId: $user->id,
                sessionId: $session->getId(),
                ipAddress: $ipAddress,
            );

            throw new DomainRuleException('REAUTH_FAILED', 'Re-authentication failed. Check your password.', 403);
        }

        RateLimiter::clear($throttleKey);
        $session->put(self::REAUTH_KEY, CarbonImmutable::now()->getTimestamp());
        $this->securityAudit->record(
            event: SecurityAuditEvent::REAUTH_SUCCEEDED,
            outcome: SecurityAuditOutcome::SUCCESS,
            actorUserId: $user->id,
            sessionId: $session->getId(),
            ipAddress: $ipAddress,
        );
    }

    public function hasFreshReauthentication(Session $session): bool
    {
        $provedAt = $session->get(self::REAUTH_KEY);

        return is_int($provedAt)
            && CarbonImmutable::now()->getTimestamp() - $provedAt < config()->integer('security.reauthentication.proof_lifetime_seconds');
    }

    /** Sensitive actions call this first; permission checks still run separately (10 §26). */
    public function requireFreshReauthentication(Session $session): void
    {
        if (! $this->hasFreshReauthentication($session)) {
            throw new DomainRuleException('REAUTH_REQUIRED', 'Confirm your current password to continue.', 403);
        }
    }
}
