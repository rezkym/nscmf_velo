<?php

declare(strict_types=1);

namespace App\Services\Administration;

use App\Domain\Administration\PermissionCatalog;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\Team;
use App\Models\User;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Repositories\Contracts\Administration\TeamRepository;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Services\Audit\SecurityAuditService;
use App\Services\Security\CredentialService;
use App\Services\Security\PermissionGate;
use App\Services\Security\SessionService;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\DatabaseManager;
use Spatie\Permission\Models\Role;

/**
 * User administration (04 §16, 10 §11–12, §22; 12 §80–87). Temporary passwords are generated
 * here, persisted as hashes only and returned to the controller for the single reveal.
 */
final readonly class UserAdministrationService
{
    public function __construct(
        private UserRepository $users,
        private TeamRepository $teams,
        private RolePermissionRepository $roles,
        private PermissionGate $gate,
        private CredentialService $credentials,
        private SessionService $sessions,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @return array{users: list<array<string, mixed>>, meta: array<string, int|null>, teams: list<array{id: int, name: string}>, roles: list<array{id: int, name: string, is_protected: bool}>}
     */
    public function list(User $actor, int $page, int $perPage): array
    {
        $this->gate->requireAll($actor, 'users.view');

        $paginator = $this->users->paginateForAdministration($page, $perPage);

        return [
            'users' => array_values(array_map(fn (User $user): array => self::row($user), $paginator->items())),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
            'teams' => $this->teamOptions(),
            'roles' => $this->roleOptions(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function row(User $user): array
    {
        $roles = [];

        foreach ($user->roles->sortBy('name') as $role) {
            if ($role instanceof Role) {
                $roles[] = ['id' => (int) $role->id, 'name' => $role->name];
            }
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'team_id' => $user->team_id,
            'team_name' => $user->team?->name,
            'is_active' => $user->is_active,
            'is_protected_superadmin' => $user->is_protected_superadmin,
            'roles' => $roles,
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function teamOptions(): array
    {
        return array_values($this->teams->active()->map(fn (Team $team): array => ['id' => $team->id, 'name' => $team->name])->all());
    }

    /**
     * @return list<array{id: int, name: string, is_protected: bool}>
     */
    public function roleOptions(): array
    {
        $options = [];

        foreach ($this->roles->allRolesWithPermissions() as $role) {
            $options[] = ['id' => (int) $role->id, 'name' => $role->name, 'is_protected' => $role->name === PermissionCatalog::ROLE_SUPERADMIN];
        }

        return $options;
    }

    /**
     * @param  list<int>  $roleIds
     * @return array{user: User, temporary_password: string}
     */
    public function create(User $actor, string $name, string $username, int $teamId, array $roleIds, Session $session): array
    {
        $this->gate->requireAll($actor, 'users.create');
        $this->credentials->requireFreshReauthentication($session);

        $password = $this->credentials->generateTemporaryPassword();

        $user = $this->database->connection()->transaction(function () use ($actor, $name, $username, $teamId, $roleIds, $password): User {
            $team = $this->teams->lockForUpdate($teamId);

            if ($team === null || ! $team->is_active) {
                throw new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, errors: ['team_id' => ['Choose an active team.']]);
            }

            $user = $this->users->create([
                'name' => $name,
                'username' => $username,
                'team_id' => $teamId,
                'password' => $password,
                'is_active' => true,
                'must_change_password' => true,
                'is_protected_superadmin' => false,
            ]);
            $this->roles->syncUserRoles($user, $roleIds);

            $this->securityAudit->record(
                event: SecurityAuditEvent::USER_CREATED,
                outcome: SecurityAuditOutcome::SUCCESS,
                actorUserId: $actor->id,
                targetUserId: $user->id,
                subjectUsername: $user->username,
                metadata: ['role_ids' => $roleIds, 'team_id' => $teamId],
            );

            return $user;
        });

        return ['user' => $user, 'temporary_password' => $password];
    }

    public function updateProfile(User $actor, int $userId, string $name): void
    {
        $this->gate->requireAll($actor, 'users.update');

        $this->database->connection()->transaction(function () use ($actor, $userId, $name): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();
            $this->users->update($user, ['name' => $name]);
            $this->audit($actor, SecurityAuditEvent::USER_UPDATED, $user);
        });
    }

    public function enable(User $actor, int $userId): void
    {
        $this->gate->requireAll($actor, 'users.enable');

        $this->database->connection()->transaction(function () use ($actor, $userId): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();

            if ($user->is_active) {
                throw new DomainRuleException('USER_STATE_CONFLICT', 'This user is already active.', 409);
            }

            $this->users->update($user, ['is_active' => true]);
            $this->audit($actor, SecurityAuditEvent::USER_ENABLED, $user);
        });
    }

    public function disable(User $actor, int $userId, Session $session): void
    {
        $this->gate->requireAll($actor, 'users.disable');
        $this->credentials->requireFreshReauthentication($session);

        $this->database->connection()->transaction(function () use ($actor, $userId): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();
            $this->guardProtected($user, 'The protected Superadmin cannot be disabled.');

            if (! $user->is_active) {
                throw new DomainRuleException('USER_STATE_CONFLICT', 'This user is already disabled.', 409);
            }

            $this->users->update($user, ['is_active' => false]);
            $this->sessions->revokeAllForUser($user->id);
            $this->audit($actor, SecurityAuditEvent::USER_DISABLED, $user);
        });
    }

    /**
     * @return string the one-time temporary password
     */
    public function resetPassword(User $actor, int $userId, Session $session): string
    {
        $this->gate->requireAll($actor, 'users.reset_password');
        $this->credentials->requireFreshReauthentication($session);

        $password = $this->credentials->generateTemporaryPassword();

        $this->database->connection()->transaction(function () use ($actor, $userId, $password): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();
            $this->guardProtected($user, 'The protected Superadmin password cannot be reset through administration.');

            $this->users->update($user, ['password' => $password, 'must_change_password' => true]);
            $this->sessions->revokeAllForUser($user->id);
            $this->audit($actor, SecurityAuditEvent::PASSWORD_RESET, $user);
        });

        return $password;
    }

    /**
     * @param  list<int>  $roleIds
     */
    public function replaceRoles(User $actor, int $userId, array $roleIds, Session $session): void
    {
        $this->gate->requireAll($actor, 'users.assign_roles');
        $this->credentials->requireFreshReauthentication($session);

        $this->database->connection()->transaction(function () use ($actor, $userId, $roleIds): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();

            if ($user->is_protected_superadmin) {
                $superadmin = $this->roles->findRoleByName(PermissionCatalog::ROLE_SUPERADMIN);

                if ($superadmin === null || ! in_array((int) $superadmin->id, $roleIds, true)) {
                    $this->deny('The protected Superadmin must keep the Superadmin role.');
                }
            }

            $before = $this->permissionNames($user);
            $this->roles->syncUserRoles($user, $roleIds);
            $user->unsetRelation('roles')->unsetRelation('permissions');

            if ($before !== $this->permissionNames($user)) {
                $this->sessions->revokeAllForUser($user->id);
            }

            $this->audit($actor, SecurityAuditEvent::USER_ROLES_CHANGED, $user, ['role_ids' => $roleIds]);
        });
    }

    /** Team is metadata: no session revocation and no permission change (10 §22). */
    public function changeTeam(User $actor, int $userId, int $teamId): void
    {
        $this->gate->requireAny($actor, 'users.assign_team', 'teams.assign_users');

        $this->database->connection()->transaction(function () use ($actor, $userId, $teamId): void {
            $user = $this->users->lockForUpdate($userId) ?? throw DomainRuleException::notFound();
            $team = $this->teams->lockForUpdate($teamId);

            if ($team === null || ! $team->is_active) {
                throw new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, errors: ['team_id' => ['Choose an active team.']]);
            }

            $this->users->update($user, ['team_id' => $team->id]);
            $this->audit($actor, SecurityAuditEvent::USER_TEAM_CHANGED, $user, ['team_id' => $team->id]);
        });
    }

    /**
     * @return list<string>
     */
    private function permissionNames(User $user): array
    {
        return array_values($user->getAllPermissions()->pluck('name')->map(fn (mixed $name): string => is_string($name) ? $name : '')->sort()->values()->all());
    }

    private function guardProtected(User $target, string $message): void
    {
        if ($target->is_protected_superadmin) {
            $this->deny($message);
        }
    }

    private function deny(string $message): never
    {
        throw new DomainRuleException('PROTECTED_RESOURCE', $message, 403);
    }

    /**
     * @param  array<string, scalar|null|list<scalar>>  $metadata
     */
    private function audit(User $actor, SecurityAuditEvent $event, User $target, array $metadata = []): void
    {
        $this->securityAudit->record(
            event: $event,
            outcome: SecurityAuditOutcome::SUCCESS,
            actorUserId: $actor->id,
            targetUserId: $target->id,
            subjectUsername: $target->username,
            metadata: $metadata,
        );
    }
}
