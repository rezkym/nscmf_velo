<?php

declare(strict_types=1);

namespace App\Domain\Administration;

/**
 * The explicit permission catalog and default role bundles (04 §12–20, §33–36; 17 §12–14).
 * No wildcard rows, no session.login/logout rows, and roles.archive stays unseeded.
 */
final class PermissionCatalog
{
    public const string ROLE_SUPERADMIN = 'Superadmin';

    public const string ROLE_REQUESTER = 'Requester';

    public const string ROLE_REVIEWER = 'Reviewer';

    public const string ROLE_APPROVER = 'Approver';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            'nscmf.create',
            'nscmf.draft.edit',
            'nscmf.submit',
            'nscmf.cancel',
            'nscmf.change.result.edit',
            'nscmf.view',
            'nscmf.view.history',
            'nscmf.attachment.manage',
            'nscmf.export',
            'nscmf.export.bulk',
            'nscmf.timeline.view',
            'nscmf.review',
            'nscmf.review.forward',
            'nscmf.review.return',
            'nscmf.review.reject',
            'nscmf.approve',
            'nscmf.approval.return_reviewer',
            'nscmf.approval.return_requester',
            'nscmf.approval.reject',
            'nscmf.reopen',
            'nscmf.archive',
            'users.view',
            'users.create',
            'users.update',
            'users.enable',
            'users.disable',
            'users.reset_password',
            'users.assign_roles',
            'users.assign_team',
            'roles.view',
            'roles.create',
            'roles.update',
            'permissions.assign',
            'teams.view',
            'teams.create',
            'teams.update',
            'teams.archive',
            'teams.assign_users',
            'system.settings.manage',
            'audit.access.view',
            'audit.security.view',
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function defaultRoleBundles(): array
    {
        $shared = ['nscmf.view', 'nscmf.view.history', 'nscmf.timeline.view', 'nscmf.export', 'nscmf.export.bulk'];

        return [
            self::ROLE_SUPERADMIN => self::all(),
            self::ROLE_REQUESTER => [
                'nscmf.create', 'nscmf.draft.edit', 'nscmf.submit', 'nscmf.cancel', 'nscmf.change.result.edit',
                'nscmf.attachment.manage', ...$shared,
            ],
            self::ROLE_REVIEWER => ['nscmf.review', 'nscmf.review.forward', 'nscmf.review.return', 'nscmf.review.reject', ...$shared],
            self::ROLE_APPROVER => [
                'nscmf.approve', 'nscmf.approval.return_reviewer', 'nscmf.approval.return_requester', 'nscmf.approval.reject', ...$shared,
            ],
        ];
    }
}
