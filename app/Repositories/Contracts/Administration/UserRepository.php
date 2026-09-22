<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateForAdministration(int $page, int $perPage): LengthAwarePaginator;

    /** Setup readiness: an active non-protected user holding at least one role. */
    public function hasActiveNormalUserWithRole(): bool;

    /** Re-reads the user row under a write lock for an identity/security mutation. */
    public function lockForUpdate(int $id): ?User;
}
