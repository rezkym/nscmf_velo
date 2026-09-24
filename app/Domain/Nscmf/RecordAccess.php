<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Models\Nscmf\NscmfRecord;
use App\Models\User;

/**
 * Record resource visibility (12 §17.1, confirmed 2026-09-22): a never-submitted record is
 * visible to its owner only; any other record to actors holding the read permission. Team never
 * participates and there is no Superadmin exception.
 */
final class RecordAccess
{
    /** The page/read permissions of 12 §17.1: History, record view or a queue. */
    private const array READ_PERMISSIONS = ['nscmf.view', 'nscmf.view.history', 'nscmf.review', 'nscmf.approve'];

    public static function isVisibleTo(NscmfRecord $record, User $actor): bool
    {
        if ($record->owner_user_id === $actor->id) {
            return true;
        }

        return ! $record->business_status->isNeverSubmitted() && $actor->hasAnyPermission(self::READ_PERMISSIONS);
    }

    public static function isOwnedBy(NscmfRecord $record, int $userId): bool
    {
        return $record->owner_user_id === $userId;
    }
}
