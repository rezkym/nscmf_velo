<?php

declare(strict_types=1);

namespace App\Infrastructure\Pdf;

/**
 * Workbook → PDF through a qualified spreadsheet renderer (14 §71–76). There is no HTML or
 * approximate fallback: a renderer failure fails the export.
 */
interface SpreadsheetRenderer
{
    public function isAvailable(): bool;

    /**
     * Renders $xlsxPath into a PDF inside $workspace and returns the PDF path, leaving out the
     * given number of leading and trailing pages.
     *
     * @param  array{int, int}  $skipPages  [leading, trailing]
     *
     * @throws RenderFailed
     */
    public function render(string $xlsxPath, string $workspace, array $skipPages = [0, 0]): string;
}
