<?php

declare(strict_types=1);

namespace App\Infrastructure\Pdf;

use Illuminate\Support\Facades\Process;

/**
 * LibreOffice Headless, the first renderer candidate (14 §73, DG-01). Each run gets its own
 * throw-away user profile inside the private workspace and a finite timeout.
 */
final readonly class LibreOfficeRenderer implements SpreadsheetRenderer
{
    public function __construct(
        private string $executable,
        private int $timeoutSeconds,
    ) {}

    public function isAvailable(): bool
    {
        return $this->executable !== '' && is_executable($this->executable);
    }

    public function render(string $xlsxPath, string $workspace, array $skipPages = [0, 0]): string
    {
        if (! $this->isAvailable()) {
            throw new RenderFailed('The spreadsheet renderer is not available.');
        }

        $pdf = $this->convert($xlsxPath, $workspace, 'pdf');
        if ($skipPages === [0, 0]) {
            return $pdf;
        }

        // A second pass keeps only the wanted page range; page counts come from the first pass.
        $pages = self::pageCount($pdf);
        [$first, $last] = [1 + $skipPages[0], $pages - $skipPages[1]];
        if ($first > $last) {
            throw new RenderFailed('The rendered PDF has fewer pages than the template requires.');
        }
        unlink($pdf);

        return $this->convert($xlsxPath, $workspace, 'pdf:calc_pdf_Export:'.json_encode(['PageRange' => ['type' => 'string', 'value' => "{$first}-{$last}"]]));
    }

    private function convert(string $xlsxPath, string $workspace, string $target): string
    {
        $result = Process::timeout($this->timeoutSeconds)->path($workspace)->run([
            $this->executable,
            '-env:UserInstallation=file://'.$workspace.'/profile',
            '--headless', '--norestore', '--nolockcheck',
            '--convert-to', $target, '--outdir', $workspace, $xlsxPath,
        ]);

        $pdf = $workspace.'/'.pathinfo($xlsxPath, PATHINFO_FILENAME).'.pdf';
        if (! $result->successful() || ! is_file($pdf) || filesize($pdf) === 0) {
            throw new RenderFailed('The spreadsheet renderer did not produce a PDF.');
        }

        return $pdf;
    }

    private static function pageCount(string $pdf): int
    {
        return preg_match_all('#/Type\s*/Page[^s]#', (string) file_get_contents($pdf)) ?: 0;
    }
}
