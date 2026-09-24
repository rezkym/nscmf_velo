<?php

declare(strict_types=1);

namespace App\Services\Security;

use App\Domain\Shared\DomainRuleException;
use App\Models\User;

/**
 * Permission-centric checks through Spatie (04 §2). No role-name, Team or superadmin shortcut.
 */
final class PermissionGate
{
    public function requireAll(User $actor, string ...$permissions): void
    {
        foreach ($permissions as $permission) {
            if (! $actor->can($permission)) {
                throw DomainRuleException::forbidden();
            }
        }
    }

    public function requireAny(User $actor, string ...$permissions): void
    {
        foreach ($permissions as $permission) {
            if ($actor->can($permission)) {
                return;
            }
        }

        throw DomainRuleException::forbidden();
    }
}
