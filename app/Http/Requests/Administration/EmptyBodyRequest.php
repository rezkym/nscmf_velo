<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;

/** Explicit actions whose body is exactly {} (12 §96.2). */
final class EmptyBodyRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return match (true) {
            $this->routeIs('administration.teams.deactivate', 'administration.teams.reactivate') => ['teams.archive'],
            $this->routeIs('administration.users.enable') => ['users.enable'],
            $this->routeIs('administration.users.disable') => ['users.disable'],
            $this->routeIs('administration.users.reset-password') => ['users.reset_password'],
            default => [],
        };
    }

    protected function allowedKeys(): array
    {
        return [];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
