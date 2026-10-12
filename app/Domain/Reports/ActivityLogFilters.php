<?php

declare(strict_types=1);

namespace App\Domain\Reports;

use App\Domain\Nscmf\Enums\NscmfStatus;

/**
 * The Activity Log filters (12 §47.2): defaults and limits shared by the page and the export.
 *
 * @phpstan-type LogFilters array{q: string|null, family: string|null, subtype: string|null, statuses: list<string>, archived: string, request_date_from: string|null, request_date_to: string|null}
 * @phpstan-type LogQuery array{page: int, per_page: int, q: string|null, family: string|null, subtype: string|null, statuses: list<string>, archived: string, request_date_from: string|null, request_date_to: string|null}
 */
final class ActivityLogFilters
{
    /** Entries per export (02 BR-RPT-004). */
    public const int MAX_ENTRIES = 1000;

    /** `all` lists active and archived records together; it is the default of a log. */
    public const array ARCHIVE_VIEWS = ['all', 'active', 'archived'];

    /**
     * Every status a record can hold after its first submission (the page default).
     *
     * @return list<string>
     */
    public static function submittedStatuses(): array
    {
        return array_values(array_map(
            fn (NscmfStatus $status): string => $status->value,
            array_filter(NscmfStatus::cases(), fn (NscmfStatus $status): bool => ! $status->isNeverSubmitted()),
        ));
    }
}
