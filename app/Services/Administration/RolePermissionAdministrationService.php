<?php

declare(strict_types=1);

namespace App\Services\Administration;

use App\Domain\Administration\PermissionCatalog;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Services\Audit\SecurityAuditService;
use App\Services\Security\CredentialService;
use App\Services\Security\PermissionGate;
use App\Services\Security\SessionService;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\DatabaseManager;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Role and permission administration on top of Spatie (04 §17, 11 §57, 12 §88–92). The
 * Superadmin role is protected: its name and full bundle never change.
 */
final readonly class RolePermissionAdministrationService
{
    public function __construct(
        private RolePermissionRepository $roles,
        private PermissionGate $gate,
        private CredentialService $credentials,
        private SessionService $sessions,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @return list<array{id: int, name: string, is_protected: bool, permissions: list<string>}>
     */
    public function list(User $actor): array
    {
        $this->gate->requireAll($actor, 'roles.view');

        return $this->rows();
    }

    /**
     * @return list<array{id: int, name: string, is_protected: bool, permissions: list<string>}>
     */
    public function rows(): array
    {
        return array_values($this->roles->allRolesWithPermissions()->map(fn (Role $role): array => [
            'id' => (int) $role->id,
            'name' => $role->name,
            'is_protected' => self::isProtected($role),
            'permissions' => array_values($role->permissions->map(fn (Permission $permission): string => $permission->name)->sort()->values()->all()),
        ])->all());
    }

    /**
     * @return list<array{name: string, group: string}>
     */
    public function catalog(User $actor): array
    {
        $this->gate->requireAll($actor, 'roles.view');

        return self::catalogRows();
    }

    /**
     * @return list<array{name: string, group: string}>
     */
    public static function catalogRows(): array
    {
        return array_map(
            fn (string $name): array => ['name' => $name, 'group' => PermissionCatalog::group($name)],
            PermissionCatalog::all(),
        );
    }

    public function create(User $actor, string $name): void
    {
        $this->gate->requireAll($actor, 'roles.create');

        $this->database->connection()->transaction(function () use ($actor, $name): void {
            $role = $this->roles->createRole($name);
            $this->audit($actor, SecurityAuditEvent::ROLE_CREATED, $role);
        });
    }

    public function rename(User $actor, int $roleId, string $name): void
    {
        $this->gate->requireAll($actor, 'roles.update');

        $this->database->connection()->transaction(function () use ($actor, $roleId, $name): void {
            $role = $this->roles->findRole($roleId) ?? throw DomainRuleException::notFound();

            if (self::isProtected($role)) {
                throw new DomainRuleException('PROTECTED_RESOURCE', 'The Superadmin role cannot be renamed.', 403);
            }

            $this->roles->renameRole($role, $name);
            $this->audit($actor, SecurityAuditEvent::ROLE_UPDATED, $role);
        });
    }

    /**
     * @param  list<string>  $permissions
     */
    public function replacePermissions(User $actor, int $roleId, array $permissions, Session $session): void
    {
        $this->gate->requireAll($actor, 'permissions.assign');
        $this->credentials->requireFreshReauthentication($session);

        $this->database->connection()->transaction(function () use ($actor, $roleId, $permissions): void {
            $role = $this->roles->findRole($roleId) ?? throw DomainRuleException::notFound();

            if (self::isProtected($role)) {
                throw new DomainRuleException('PROTECTED_RESOURCE', 'The Superadmin role always keeps every permission.', 403);
            }

            $before = $role->permissions->pluck('name')->sort()->values()->all();
            $after = collect($permissions)->unique()->sort()->values()->all();
            $this->roles->syncRolePermissions($role, array_values($after));

            if ($before !== $after) {
                foreach ($this->roles->userIdsWithRole($role) as $userId) {
                    $this->sessions->revokeAllForUser($userId);
                }
            }

            $this->audit($actor, SecurityAuditEvent::ROLE_PERMISSIONS_CHANGED, $role, ['permissions' => array_values($after)]);
        });
    }

    private static function isProtected(Role $role): bool
    {
        return $role->name === PermissionCatalog::ROLE_SUPERADMIN;
    }

    /**
     * @param  array<string, scalar|null|list<scalar>>  $metadata
     */
    private function audit(User $actor, SecurityAuditEvent $event, Role $role, array $metadata = []): void
    {
        $this->securityAudit->record(
            event: $event,
            outcome: SecurityAuditOutcome::SUCCESS,
            actorUserId: $actor->id,
            metadata: ['role_id' => (int) $role->id, ...$metadata],
        );
    }
}
