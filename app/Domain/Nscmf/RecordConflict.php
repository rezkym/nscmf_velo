<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;

/** The 409 conflicts every record mutation revalidates under its row lock (12 §9.2, §21). */
final class RecordConflict
{
    public static function state(NscmfRecord $record, string $message): DomainRuleException
    {
        return new DomainRuleException('NSCMF_STATE_CONFLICT', $message, 409, self::context($record));
    }

    public static function version(NscmfRecord $record, string $message = 'A newer version of this record exists. Refresh the record and try again.'): DomainRuleException
    {
        return new DomainRuleException('NSCMF_VERSION_CONFLICT', $message, 409, self::context($record));
    }

    public static function archived(NscmfRecord $record): DomainRuleException
    {
        return new DomainRuleException('NSCMF_ARCHIVED_CONFLICT', 'This record is archived.', 409, self::context($record));
    }

    /**
     * @return array<string, mixed>
     */
    private static function context(NscmfRecord $record): array
    {
        return ['latest_record_version' => $record->record_version, 'current_business_status' => $record->business_status->value];
    }
}
