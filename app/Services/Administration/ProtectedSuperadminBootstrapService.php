<?php

declare(strict_types=1);

namespace App\Services\Administration;

use App\Domain\Administration\PermissionCatalog;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Services\Audit\SecurityAuditService;
use App\Services\Security\CredentialService;
use Illuminate\Database\DatabaseManager;

/**
 * Operator-controlled Protected Superadmin bootstrap (17 §20–25). The temporary password is
 * generated in memory, persisted only as a hash, and returned once after commit. A rerun
 * never resets the account; an incompatible existing username fails visibly.
 */
final readonly class ProtectedSuperadminBootstrapService
{
    public const string USERNAME = 'superadmin';

    public function __construct(
        private UserRepository $users,
        private RolePermissionRepository $roles,
        private CredentialService $credentials,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @return array{created: true, password: string}|array{created: false}
     */
    public function bootstrap(): array
    {
        $role = $this->roles->findRoleByName(PermissionCatalog::ROLE_SUPERADMIN)
            ?? throw new DomainRuleException('REFERENCE_DATA_MISSING', 'Reference roles are missing. Run the reference seeder first.', 409);

        $existing = $this->users->findByUsername(self::USERNAME);

        if ($existing !== null) {
            if (! $existing->is_protected_superadmin) {
                throw new DomainRuleException(
                    'PROTECTED_IDENTITY_CONFLICT',
                    'An account named "superadmin" exists but is not the protected identity. Resolve it manually; nothing was changed.',
                    409,
                );
            }

            return ['created' => false];
        }

        $password = $this->credentials->generateTemporaryPassword();

        $this->database->connection()->transaction(function () use ($password, $role): void {
            $user = $this->users->create([
                'username' => self::USERNAME,
                'name' => 'Protected Superadmin',
                'team_id' => null,
                'password' => $password,
                'is_active' => true,
                'is_protected_superadmin' => true,
                'must_change_password' => true,
            ]);
            $this->roles->syncUserRoles($user, [(int) $role->id]);

            $this->securityAudit->record(
                event: SecurityAuditEvent::USER_CREATED,
                outcome: SecurityAuditOutcome::SUCCESS,
                targetUserId: $user->id,
                subjectUsername: $user->username,
                metadata: ['channel' => 'OPERATOR_BOOTSTRAP'],
            );
        });

        return ['created' => true, 'password' => $password];
    }
}
