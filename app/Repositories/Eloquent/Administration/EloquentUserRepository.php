<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Administration;

use App\Models\User;
use App\Repositories\Contracts\Administration\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentUserRepository implements UserRepository
{
    public function findByUsername(string $username): ?User
    {
        // The utf8mb4_0900_ai_ci column collation already compares case-insensitively.
        return User::query()->where('username', trim($username))->first();
    }

    public function findById(int $id): ?User
    {
        return User::query()->find($id);
    }

    public function create(array $attributes): User
    {
        return User::query()->create($attributes);
    }

    public function update(User $user, array $attributes): void
    {
        $user->forceFill($attributes)->save();
    }

    public function paginateForAdministration(int $page, int $perPage): LengthAwarePaginator
    {
        return User::query()
            ->with(['team', 'roles'])
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(perPage: $perPage, page: $page);
    }

    public function hasActiveNormalUserWithRole(): bool
    {
        return User::query()
            ->where('is_active', true)
            ->where('is_protected_superadmin', false)
            ->whereHas('roles')
            ->exists();
    }

    public function lockForUpdate(int $id): ?User
    {
        return User::query()->lockForUpdate()->find($id);
    }
}
