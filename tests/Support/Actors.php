<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Administration\PermissionCatalog;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Test-owned identities (17 §11: tests arrange their own state, never the demo seed).
 */
final class Actors
{
    public const string PASSWORD = 'secret-pass';

    public static function catalog(): void
    {
        foreach (PermissionCatalog::all() as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public static function team(string $name = 'Team NOC', bool $active = true): Team
    {
        return Team::query()->create(['name' => $name.' '.Str::random(4), 'is_active' => $active]);
    }

    /**
     * A user holding exactly $permissions through one throw-away role.
     *
     * @param  list<string>  $permissions
     * @param  array<string, mixed>  $attributes
     */
    public static function user(array $permissions = [], array $attributes = []): User
    {
        self::catalog();

        $user = User::query()->create(array_merge([
            'name' => 'Test '.Str::random(6),
            'username' => 'user.'.Str::lower(Str::random(10)),
            'password' => self::PASSWORD,
            'is_active' => true,
            'must_change_password' => false,
            'is_protected_superadmin' => false,
        ], $attributes));

        if ($permissions !== []) {
            $role = Role::findOrCreate('role-'.Str::lower(Str::random(10)), 'web');
            $role->syncPermissions($permissions);
            $user->assignRole($role);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }

    /**
     * @param  list<string>  $permissions
     * @param  array<string, mixed>  $attributes
     */
    public static function member(array $permissions = [], array $attributes = []): User
    {
        return self::user($permissions, ['team_id' => self::team()->id, ...$attributes]);
    }

    /** The default Requester bundle with an active Team. */
    public static function requester(array $attributes = []): User
    {
        return self::member(PermissionCatalog::defaultRoleBundles()[PermissionCatalog::ROLE_REQUESTER], $attributes);
    }

    public static function reviewer(array $attributes = []): User
    {
        return self::member(PermissionCatalog::defaultRoleBundles()[PermissionCatalog::ROLE_REVIEWER], $attributes);
    }

    public static function superadmin(): User
    {
        self::catalog();

        $role = Role::findOrCreate(PermissionCatalog::ROLE_SUPERADMIN, 'web');
        $role->syncPermissions(PermissionCatalog::all());

        $user = self::user([], [
            'username' => 'superadmin',
            'name' => 'Protected Superadmin',
            'is_protected_superadmin' => true,
        ]);
        $user->assignRole($role);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->refresh();
    }
}
