<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

use App\Domain\Reports\ActivityLogMappingV1;
use DOMDocument;
use DOMElement;
use DOMXPath;
use ZipArchive;

/**
 * ZipArchive + DOM patcher for the one-sheet log workbook. Rows beyond the first page are copies
 * of the last entry row inserted below it; the signature block and its merges move down by the
 * same amount, each extra page starts after a manual page break, and the column headings repeat
 * through the print titles. Values go into the template's own styled cells.
 */
final class OoxmlActivityLogPatcher implements ActivityLogWorkbookPatcher
{
    private const string SHEET = 'xl/worksheets/sheet1.xml';

    private const string VML = 'xl/drawings/vmlDrawing1.vml';

    private const int LAST_TEMPLATE_ROW = ActivityLogMappingV1::FIRST_ENTRY_ROW + ActivityLogMappingV1::ROWS_PER_PAGE - 1;

    /** The column spans merged on every entry row (No, Date, NSCMF No, Purpose, Customer, NOC). */
    private const array ENTRY_MERGES = [['A', 'B'], ['C', 'F'], ['G', 'K'], ['L', 'T'], ['U', 'AE'], ['AF', 'AO']];

    private const string PRINT_TITLES = "'NSCMF-Log'!\$8:\$8";

    public function patch(string $templatePath, string $outputPath, array $fill): void
    {
        if (! copy($templatePath, $outputPath)) {
            throw new WorkbookPatchFailed('Could not create the private working copy.');
        }
        $zip = new ZipArchive;
        if ($zip->open($outputPath) !== true) {
            throw new WorkbookPatchFailed('The working copy is not a readable workbook.');
        }

        $extra = $fill['rows'] - ActivityLogMappingV1::ROWS_PER_PAGE;
        $changed = [self::SHEET => $this->sheet(OoxmlPackage::member($zip, self::SHEET), $fill, $extra)];
        if ($extra > 0) {
            $changed['xl/workbook.xml'] = self::printTitles(OoxmlPackage::member($zip, 'xl/workbook.xml'));
        }
        $vml = OoxmlPackage::member($zip, self::VML);
        foreach ($fill['controls'] as $control) {
            $ctrlProp = "xl/ctrlProps/ctrlProp{$control['ctrl_prop']}.xml";
            $changed[$ctrlProp] = OoxmlPackage::checkCtrlProp(OoxmlPackage::member($zip, $ctrlProp));
            $vml = OoxmlPackage::checkShape($vml, $control['shape']);
        }
        if ($fill['controls'] !== []) {
            $changed[self::VML] = $vml;
        }

        foreach ($changed as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();

        OoxmlPackage::validate($templatePath, $outputPath, array_keys($changed));
    }

    /**
     * @param  array{rows: int, text: array<string, string>, numbers: array<string, int>, controls: list<array{ctrl_prop: int, shape: int}>}  $fill
     */
    private function sheet(string $xml, array $fill, int $extra): string
    {
        $document = OoxmlPackage::load($xml);
        $xpath = OoxmlPackage::xpath($document);
        if ($extra > 0) {
            $this->addRows($document, $xpath, $extra);
        }
        foreach ($fill['numbers'] as $reference => $number) {
            OoxmlPackage::writeNumber($document, $xpath, $reference, $number);
        }
        foreach ($fill['text'] as $reference => $text) {
            OoxmlPackage::writeText($document, $xpath, $reference, $text);
        }

        return (string) $document->saveXML();
    }

    private function addRows(DOMDocument $document, DOMXPath $xpath, int $extra): void
    {
        $sheetData = OoxmlPackage::first($xpath, '//m:sheetData') ?? throw new WorkbookPatchFailed('The log sheet has no data.');
        $lastEntry = OoxmlPackage::first($xpath, "//m:sheetData/m:row[@r='".self::LAST_TEMPLATE_ROW."']")
            ?? throw new WorkbookPatchFailed('The last entry row is missing from the template.');

        // Everything below the entry rows (the signature block) moves down, bottom-up.
        $below = [];
        foreach ($sheetData->childNodes as $row) {
            if ($row instanceof DOMElement && (int) $row->getAttribute('r') > self::LAST_TEMPLATE_ROW) {
                $below[] = $row;
            }
        }
        foreach (array_reverse($below) as $row) {
            self::renumber($row, (int) $row->getAttribute('r') + $extra);
        }

        $anchor = $lastEntry->nextSibling;
        for ($offset = 1; $offset <= $extra; $offset++) {
            $copy = $lastEntry->cloneNode(true);
            assert($copy instanceof DOMElement);
            self::renumber($copy, self::LAST_TEMPLATE_ROW + $offset);
            $sheetData->insertBefore($copy, $anchor);
        }

        $this->moveMerges($document, $xpath, $extra);
        $dimension = OoxmlPackage::first($xpath, '//m:dimension');
        $dimension?->setAttribute('ref', (string) preg_replace_callback('/(\d+)$/', fn (array $m): string => (string) ((int) $m[1] + $extra), $dimension->getAttribute('ref')));
        $this->pageBreaks($document, $xpath, $extra);
    }

    private static function renumber(DOMElement $row, int $number): void
    {
        $row->setAttribute('r', (string) $number);
        foreach ($row->childNodes as $cell) {
            if ($cell instanceof DOMElement && $cell->hasAttribute('r')) {
                $cell->setAttribute('r', (string) preg_replace('/\d+$/', (string) $number, $cell->getAttribute('r')));
            }
        }
    }

    private function moveMerges(DOMDocument $document, DOMXPath $xpath, int $extra): void
    {
        $merges = OoxmlPackage::first($xpath, '//m:mergeCells') ?? throw new WorkbookPatchFailed('The log sheet has no merged cells.');
        foreach ($merges->childNodes as $merge) {
            if ($merge instanceof DOMElement) {
                $merge->setAttribute('ref', (string) preg_replace_callback(
                    '/([A-Z]+)(\d+)/',
                    fn (array $m): string => $m[1].((int) $m[2] > self::LAST_TEMPLATE_ROW ? (int) $m[2] + $extra : (int) $m[2]),
                    $merge->getAttribute('ref'),
                ));
            }
        }
        for ($row = self::LAST_TEMPLATE_ROW + 1; $row <= self::LAST_TEMPLATE_ROW + $extra; $row++) {
            foreach (self::ENTRY_MERGES as [$from, $to]) {
                $merge = $document->createElementNS(OoxmlPackage::MAIN, 'mergeCell');
                $merge->setAttribute('ref', "{$from}{$row}:{$to}{$row}");
                $merges->appendChild($merge);
            }
        }
        $merges->setAttribute('count', (string) $merges->getElementsByTagNameNS(OoxmlPackage::MAIN, 'mergeCell')->length);
    }

    /** A manual break before every page after the first; rowBreaks sits right after pageSetup. */
    private function pageBreaks(DOMDocument $document, DOMXPath $xpath, int $extra): void
    {
        $breaks = $document->createElementNS(OoxmlPackage::MAIN, 'rowBreaks');
        $count = intdiv($extra, ActivityLogMappingV1::ROWS_PER_PAGE);
        $breaks->setAttribute('count', (string) $count);
        $breaks->setAttribute('manualBreakCount', (string) $count);
        for ($page = 1; $page <= $count; $page++) {
            $break = $document->createElementNS(OoxmlPackage::MAIN, 'brk');
            // Zero-based index of the first row of the next page.
            $break->setAttribute('id', (string) (self::LAST_TEMPLATE_ROW + ($page - 1) * ActivityLogMappingV1::ROWS_PER_PAGE));
            $break->setAttribute('max', '16383');
            $break->setAttribute('man', '1');
            $breaks->appendChild($break);
        }

        $pageSetup = OoxmlPackage::first($xpath, '//m:pageSetup') ?? throw new WorkbookPatchFailed('The log sheet has no page setup.');
        $pageSetup->parentNode?->insertBefore($breaks, $pageSetup->nextSibling);
    }

    /** The column headings (row 8) repeat on every printed page. */
    private static function printTitles(string $xml): string
    {
        if (str_contains($xml, '_xlnm.Print_Titles')) {
            return $xml;
        }
        $definedName = '<definedName name="_xlnm.Print_Titles" localSheetId="0">'.htmlspecialchars(self::PRINT_TITLES, ENT_XML1 | ENT_NOQUOTES).'</definedName>';
        $patched = str_contains($xml, '</definedNames>')
            ? str_replace('</definedNames>', $definedName.'</definedNames>', $xml)
            : (string) preg_replace_callback('#</sheets>#', fn (): string => '</sheets><definedNames>'.$definedName.'</definedNames>', $xml, 1);
        if ($patched === $xml) {
            throw new WorkbookPatchFailed('The print titles could not be set.');
        }

        return $patched;
    }
}
