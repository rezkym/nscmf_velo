<?php

declare(strict_types=1);

namespace App\Domain\Reports;

/**
 * Mapping `nscmf-activity-log/v1` from an Activity Log snapshot to the log workbook
 * (docs/activity-log-template-mapping.md, G26).
 */
final class ActivityLogMappingV1
{
    public const string VERSION = 'nscmf-activity-log/v1';
}
