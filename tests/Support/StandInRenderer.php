<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Infrastructure\Pdf\RenderFailed;
use App\Infrastructure\Pdf\SpreadsheetRenderer;

/**
 * Where LibreOffice is not installed (CI), the export → sign → issue → verify chain is still
 * exercised with real cryptography: this stand-in writes a small but well-formed one-page PDF
 * whose content depends on the workbook bytes. Rendering fidelity itself is only ever proven
 * with the real renderer and the official workbook.
 */
final class StandInRenderer implements SpreadsheetRenderer
{
    public function isAvailable(): bool
    {
        return true;
    }

    public function render(string $xlsxPath, string $workspace, array $skipPages = [0, 0]): string
    {
        $digest = hash_file('sha256', $xlsxPath);
        if ($digest === false) {
            throw new RenderFailed('The workbook could not be read.');
        }
        $text = "BT /F1 12 Tf 72 720 Td (NSCMF stand-in render {$digest}) Tj ET";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
            '<< /Length '.strlen($text)." >>\nstream\n{$text}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $index => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$body}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        $path = $workspace.'/nscmf.pdf';
        if (file_put_contents($path, $pdf) === false) {
            throw new RenderFailed('The stand-in PDF could not be written.');
        }

        return $path;
    }
}
