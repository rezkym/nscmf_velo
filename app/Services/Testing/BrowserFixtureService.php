<?php

declare(strict_types=1);

namespace App\Services\Testing;

use App\Domain\Shared\DomainRuleException;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Repositories\Contracts\Administration\TeamRepository;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Services\Security\CredentialService;
use App\Support\Runtime\DisposableRuntimeGuard;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

/**
 * Synthetic accounts for Chromium journeys (BE-005). Usable only inside the guarded browser
 * runtime; passwords are random per call and returned to the calling test process only.
 */
final readonly class BrowserFixtureService
{
    public function __construct(
        private UserRepository $users,
        private TeamRepository $teams,
        private RolePermissionRepository $roles,
        private CredentialService $credentials,
        private DatabaseManager $database,
    ) {}

    public static function assertBrowserRuntime(): void
    {
        $problems = DisposableRuntimeGuard::currentProblems();

        if (! config()->boolean('nscmf.browser_testing')) {
            array_unshift($problems, 'NSCMF_BROWSER_TESTING is not enabled.');
        }

        if ($problems !== []) {
            throw new DomainRuleException('UNSAFE_TEST_RUNTIME', 'Refusing: '.implode(' ', $problems), 409);
        }
    }

    /**
     * @param  list<string>  $roleNames
     * @param  list<string>  $permissions
     * @return array<string, mixed>
     */
    public function createUser(array $roleNames, array $permissions, bool $withTeam, bool $mustChangePassword, bool $protected): array
    {
        self::assertBrowserRuntime();

        $password = $this->credentials->generateTemporaryPassword();
        $suffix = Str::lower(Str::random(8));

        return $this->database->connection()->transaction(function () use ($roleNames, $permissions, $withTeam, $mustChangePassword, $protected, $password, $suffix): array {
            $team = $withTeam ? $this->teams->create('Browser Team '.$suffix) : null;
            $user = $this->users->create([
                'name' => 'Browser User '.$suffix,
                'username' => $protected ? 'superadmin' : 'browser.'.$suffix,
                'team_id' => $team?->id,
                'password' => $password,
                'is_active' => true,
                'must_change_password' => $mustChangePassword,
                'is_protected_superadmin' => $protected,
            ]);

            $roleIds = [];
            foreach ($roleNames as $roleName) {
                $role = $this->roles->findRoleByName($roleName) ?? throw new DomainRuleException('UNKNOWN_ROLE', "Unknown role [{$roleName}].", 422);
                $roleIds[] = (int) $role->id;
            }

            if ($permissions !== []) {
                $role = $this->roles->createRole('Browser Role '.$suffix);
                $this->roles->syncRolePermissions($role, $permissions);
                $roleIds[] = (int) $role->id;
            }

            $this->roles->syncUserRoles($user, $roleIds);

            return [
                'id' => $user->id,
                'username' => $user->username,
                'password' => $password,
                'name' => $user->name,
                'team' => $team === null ? null : ['id' => $team->id, 'name' => $team->name],
                'runtime' => ['environment' => app()->environment(), 'database' => config()->string('database.connections.mysql.database')],
            ];
        });
    }
}
