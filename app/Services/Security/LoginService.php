<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Models\User;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Services\Audit\SecurityAuditService;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Username/password sign-in and sign-out (10 §6–15, 12 §76–77). Failures are generic so the
 * response never reveals whether the username exists or the account is disabled.
 */
final readonly class LoginService
{
    public const string GENERIC_FAILURE = 'These credentials do not match our records.';

    public function __construct(
        private UserRepository $users,
        private SessionService $sessions,
        private SecurityAuditService $securityAudit,
    ) {}

    public function login(string $username, string $password, ?string $ipAddress, StatefulGuard $guard, Session $session): User
    {
        $throttleKey = 'login:'.Str::lower(trim($username)).'|'.$ipAddress;

        if (RateLimiter::tooManyAttempts($throttleKey, config()->integer('security.login_throttle.max_attempts'))) {
            $this->securityAudit->record(
                event: SecurityAuditEvent::LOGIN_THROTTLED,
                outcome: SecurityAuditOutcome::DENIED,
                subjectUsername: $username,
                ipAddress: $ipAddress,
            );

            throw ValidationException::withMessages([
                'throttle' => 'Too many sign-in attempts. Try again in '.RateLimiter::availableIn($throttleKey).' seconds.',
            ]);
        }

        $user = $this->users->findByUsername($username);
        // Hash even for unknown usernames so timing does not reveal account existence.
        $passwordMatches = Hash::check($password, $user->password ?? Hash::make(Str::random(32)));

        if ($user === null || ! $passwordMatches || ! $user->is_active) {
            RateLimiter::hit($throttleKey, config()->integer('security.login_throttle.decay_seconds'));
            $this->securityAudit->record(
                event: $user !== null && $passwordMatches ? SecurityAuditEvent::LOGIN_ACCOUNT_DISABLED : SecurityAuditEvent::LOGIN_FAILED,
                outcome: SecurityAuditOutcome::FAILURE,
                targetUserId: $user?->id,
                subjectUsername: $username,
                ipAddress: $ipAddress,
            );

            throw ValidationException::withMessages(['username' => self::GENERIC_FAILURE]);
        }

        RateLimiter::clear($throttleKey);

        $guard->login($user);
        $session->regenerate(true);
        $this->sessions->anchor($session);
        $this->sessions->enforceActiveLimit($user->id, $session->getId(), $ipAddress);

        $this->securityAudit->record(
            event: SecurityAuditEvent::LOGIN_SUCCEEDED,
            outcome: SecurityAuditOutcome::SUCCESS,
            actorUserId: $user->id,
            targetUserId: $user->id,
            subjectUsername: $user->username,
            sessionId: $session->getId(),
            ipAddress: $ipAddress,
        );

        return $user;
    }

    public function logout(?User $user, StatefulGuard $guard, Session $session, ?string $ipAddress): void
    {
        $sessionId = $session->getId();

        $guard->logout();
        $session->invalidate();
        $session->regenerateToken();

        if ($user !== null) {
            $this->securityAudit->record(
                event: SecurityAuditEvent::LOGOUT,
                outcome: SecurityAuditOutcome::SUCCESS,
                actorUserId: $user->id,
                targetUserId: $user->id,
                sessionId: $sessionId,
                ipAddress: $ipAddress,
            );
        }
    }
}
