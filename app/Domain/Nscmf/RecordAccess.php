<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Models\Nscmf\NscmfRecord;

/**
 * Record resource visibility (12 §17.1, confirmed 2026-09-22): a never-submitted record is
 * visible to its owner only; any other record to actors holding the read permission. Team never
 * participates and there is no Superadmin exception.
 */
final class RecordAccess
{
    public static function isVisibleTo(NscmfRecord $record, int $userId): bool
    {
        return $record->owner_user_id === $userId || ! $record->business_status->isNeverSubmitted();
    }

    public static function isOwnedBy(NscmfRecord $record, int $userId): bool
    {
        return $record->owner_user_id === $userId;
    }
}
