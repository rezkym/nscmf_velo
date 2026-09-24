<?php

declare(strict_types=1);

namespace App\Services\Administration;

use App\Models\User;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Repositories\Contracts\Administration\TeamRepository;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Repositories\Contracts\Export\SigningCertificateRepository;
use App\Services\Security\PermissionGate;

/** Initial setup readiness derived from data; nothing is persisted (12 §96.1, gap G12). */
final readonly class SetupService
{
    public function __construct(
        private RolePermissionRepository $roles,
        private TeamRepository $teams,
        private UserRepository $users,
        private SigningCertificateRepository $certificates,
        private PermissionGate $gate,
        private UserAdministrationService $userAdministration,
        private TeamAdministrationService $teamAdministration,
        private RolePermissionAdministrationService $roleAdministration,
    ) {}

    /**
     * @return array{roles_configured: bool, teams_configured: bool, users_configured: bool, setup_completed: bool, signing_ready: bool}
     */
    public function readiness(): array
    {
        $roles = $this->roles->hasConfiguredNonSuperadminRole();
        $teams = $this->teams->hasActiveTeam();
        $users = $this->users->hasActiveNormalUserWithRole();

        return [
            'roles_configured' => $roles,
            'teams_configured' => $teams,
            'users_configured' => $users,
            'setup_completed' => $roles && $teams && $users,
            'signing_ready' => $this->certificates->hasActiveCertificate(),
        ];
    }

    /** BR-SETUP-001: the Protected Superadmin lands in the wizard until setup is complete. */
    public function mustRunSetup(User $user): bool
    {
        return $user->is_protected_superadmin && ! $this->readiness()['setup_completed'];
    }

    /**
     * @return array<string, mixed>
     */
    public function page(User $actor): array
    {
        $this->gate->requireAll($actor, 'roles.view', 'teams.view', 'users.view');

        return [
            'readiness' => $this->readiness(),
            'roles' => $this->roleAdministration->rows(),
            'teams' => $this->teamAdministration->list($actor),
            'users' => $this->userAdministration->list($actor, 1, 100)['users'],
            'permissionCatalog' => RolePermissionAdministrationService::catalogRows(),
        ];
    }
}
