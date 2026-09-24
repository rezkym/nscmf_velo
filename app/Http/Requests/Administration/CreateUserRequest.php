<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Exactly {name, username, team_id, role_ids} (12 §81, §96.2); never a password. */
final class CreateUserRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return ['users.create'];
    }

    protected function allowedKeys(): array
    {
        return ['name', 'username', 'team_id', 'role_ids'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:150', 'not_regex:/\s/', Rule::unique('users', 'username')],
            'team_id' => ['required', 'integer', Rule::exists('teams', 'id')->where('is_active', true)],
            'role_ids' => ['present', 'array'],
            'role_ids.*' => ['integer', 'distinct', Rule::exists('roles', 'id')->where('guard_name', 'web')],
        ];
    }

    /**
     * @return list<int>
     */
    public function roleIds(): array
    {
        return RoleIdsRequest::integers($this->input('role_ids'));
    }
}
