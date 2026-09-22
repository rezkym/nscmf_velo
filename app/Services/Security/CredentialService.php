<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Services\Audit\SecurityAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Current-password re-authentication (10 §23–26). The proof is a server-side session
 * timestamp; nothing reusable is returned to the browser.
 */
final readonly class CredentialService
{
    public const string REAUTH_KEY = 'nscmf.reauthenticated_at';

    /** Unambiguous characters for a password a person reads out and types once. */
    private const string TEMPORARY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

    private const int TEMPORARY_LENGTH = 16;

    public function __construct(
        private SecurityAuditService $securityAudit,
        private UserRepository $users,
        private SessionService $sessions,
        private DatabaseManager $database,
    ) {}

    /**
     * Mandatory temporary-password replacement (12 §78): hash the new password, clear the gate,
     * end the account's other sessions and give the current one a fresh identifier.
     */
    public function replaceTemporaryPassword(User $user, string $newPassword, Session $session, ?string $ipAddress): void
    {
        $this->database->connection()->transaction(function () use ($user, $newPassword, $session, $ipAddress): void {
            $locked = $this->users->lockForUpdate($user->id);

            if ($locked === null || ! $locked->must_change_password) {
                throw DomainRuleException::forbidden('There is no pending password change for this account.');
            }

            $this->users->update($locked, [
                'password' => $newPassword,
                'must_change_password' => false,
                'password_changed_at' => CarbonImmutable::now(),
            ]);
            $this->sessions->revokeAllForUser($locked->id, $session->getId());

            $this->securityAudit->record(
                event: SecurityAuditEvent::TEMPORARY_PASSWORD_REPLACED,
                outcome: SecurityAuditOutcome::SUCCESS,
                actorUserId: $locked->id,
                targetUserId: $locked->id,
                sessionId: $session->getId(),
                ipAddress: $ipAddress,
            );
        });

        $session->regenerate(true);
    }

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

    /**
     * Server-generated one-time temporary password (10 §11). The plaintext lives only in memory
     * for hashing and the single reveal; callers must never store or log it.
     */
    public function generateTemporaryPassword(): string
    {
        $password = '';
        $max = strlen(self::TEMPORARY_ALPHABET) - 1;

        for ($i = 0; $i < self::TEMPORARY_LENGTH; $i++) {
            $password .= self::TEMPORARY_ALPHABET[random_int(0, $max)];
        }

        return $password;
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
