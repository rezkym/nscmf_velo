<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Domain\Administration\PermissionCatalog;
use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Exactly {permissions: [catalog names]}: no wildcard, session or unknown permission (12 §92). */
final class RolePermissionsRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return ['permissions.assign'];
    }

    protected function allowedKeys(): array
    {
        return ['permissions'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::in(PermissionCatalog::all())],
        ];
    }

    /**
     * @return list<string>
     */
    public function permissions(): array
    {
        $values = $this->input('permissions');

        return is_array($values) ? array_values(array_filter($values, 'is_string')) : [];
    }
}
