<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Exactly {role_ids} (12 §86, §96.2). No direct user-permission payload. */
final class RoleIdsRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return ['users.assign_roles'];
    }

    protected function allowedKeys(): array
    {
        return ['role_ids'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'role_ids' => ['present', 'array'],
            'role_ids.*' => ['integer', 'distinct', Rule::exists('roles', 'id')->where('guard_name', 'web')],
        ];
    }

    /**
     * @return list<int>
     */
    public function roleIds(): array
    {
        return self::integers($this->input('role_ids'));
    }

    /**
     * @return list<int>
     */
    public static function integers(mixed $values): array
    {
        return is_array($values) ? array_values(array_map(fn (mixed $value): int => is_numeric($value) ? (int) $value : 0, $values)) : [];
    }
}
