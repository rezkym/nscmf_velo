<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

final class RoleNameRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return $this->routeIs('administration.roles.store') ? ['roles.create'] : ['roles.update'];
    }

    protected function allowedKeys(): array
    {
        return ['name'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $role = $this->route('role');

        return [
            'name' => ['required', 'string', 'max:125', Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore(is_numeric($role) ? (int) $role : null)],
        ];
    }
}
