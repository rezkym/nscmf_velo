<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

/**
 * Targeted OOXML patch of the Activity Log workbook (docs/activity-log-template-mapping.md):
 * only the members the fill owns change; everything else stays byte-identical.
 *
 * @phpstan-import-type ActivityLogFill from \App\Domain\Reports\ActivityLogMappingV1
 */
interface ActivityLogWorkbookPatcher
{
    /**
     * Copies $templatePath to $outputPath and applies $fill to the copy.
     *
     * @param  ActivityLogFill  $fill
     *
     * @throws WorkbookPatchFailed when the result fails structural validation
     */
    public function patch(string $templatePath, string $outputPath, array $fill): void;
}
