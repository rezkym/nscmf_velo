<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\User;

interface UserRepository
{
    /** Case-insensitive lookup by the login identifier (11 §9). */
    public function findByUsername(string $username): ?User;

    public function findById(int $id): ?User;
}
