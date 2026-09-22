<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;

/** Exactly {name}: password, flags, roles, Team and status use explicit actions (12 §82). */
final class UserProfileRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return ['users.update'];
    }

    protected function allowedKeys(): array
    {
        return ['name'];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:150']];
    }
}
