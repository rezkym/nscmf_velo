<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Administration;

use App\Models\User;
use App\Repositories\Contracts\Administration\UserRepository;

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

    public function lockForUpdate(int $id): ?User
    {
        return User::query()->lockForUpdate()->find($id);
    }
}
