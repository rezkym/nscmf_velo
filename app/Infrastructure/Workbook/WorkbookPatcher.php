<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

/**
 * Targeted OOXML patching of the official workbook (08, 14 §66–68, BE-107): only the members
 * the fill owns change; everything else stays byte-identical. Never a generic rewrite.
 *
 * @phpstan-import-type WorkbookFill from \App\Domain\Export\NscmfFormMappingV1
 */
interface WorkbookPatcher
{
    /**
     * Copies $templatePath to $outputPath and applies $fill to the copy.
     *
     * @param  WorkbookFill  $fill
     *
     * @throws WorkbookPatchFailed when the result fails structural validation
     */
    public function patch(string $templatePath, string $outputPath, array $fill): void;
}
