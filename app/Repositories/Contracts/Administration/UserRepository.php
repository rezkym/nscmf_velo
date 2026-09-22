<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\User;

interface UserRepository
{
    /** Case-insensitive lookup by the login identifier (11 §9). */
    public function findByUsername(string $username): ?User;

    public function findById(int $id): ?User;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): User;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $user, array $attributes): void;

    /** Re-reads the user row under a write lock for an identity/security mutation. */
    public function lockForUpdate(int $id): ?User;
}
