<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

use DOMDocument;
use DOMElement;
use DOMXPath;
use ZipArchive;

/**
 * ZipArchive + DOM patcher. Cells receive inline strings in their existing styled element, so
 * sharedStrings.xml and styles.xml are never rewritten; checkboxes are set in both their
 * ctrlProp and legacy VML shape; the other family's sheet is hidden in workbook.xml.
 */
final class OoxmlWorkbookPatcher implements WorkbookPatcher
{
    private const string MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    public function patch(string $templatePath, string $outputPath, array $fill): void
    {
        if (! copy($templatePath, $outputPath)) {
            throw new WorkbookPatchFailed('Could not create the private working copy.');
        }

        $zip = new ZipArchive;
        if ($zip->open($outputPath) !== true) {
            throw new WorkbookPatchFailed('The working copy is not a readable workbook.');
        }

        $sheetNumber = (int) substr($fill['sheet'], 5);
        $otherSheet = 'xl/worksheets/sheet'.($sheetNumber === 1 ? 2 : 1).'.xml';
        $changed = [
            "xl/worksheets/{$fill['sheet']}.xml" => self::selectTab($this->writeCells(self::member($zip, "xl/worksheets/{$fill['sheet']}.xml"), $fill['cells'])),
            'xl/workbook.xml' => self::hideSheet(self::member($zip, 'xl/workbook.xml'), $fill['hidden_sheet'], $sheetNumber - 1),
        ];
        // A hidden sheet must not stay the selected tab.
        $other = self::member($zip, $otherSheet);
        if (str_contains($other, ' tabSelected="1"')) {
            $changed[$otherSheet] = str_replace(' tabSelected="1"', '', $other);
        }
        $vmlName = "xl/drawings/vmlDrawing{$sheetNumber}.vml";
        $vml = self::member($zip, $vmlName);
        foreach ($fill['controls'] as $control) {
            $ctrlProp = "xl/ctrlProps/ctrlProp{$control['ctrl_prop']}.xml";
            $changed[$ctrlProp] = self::checkCtrlProp(self::member($zip, $ctrlProp));
            $vml = self::checkShape($vml, $control['shape']);
        }
        if ($fill['controls'] !== []) {
            $changed[$vmlName] = $vml;
        }

        foreach ($changed as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();

        $this->validate($templatePath, $outputPath, array_keys($changed));
    }

    /**
     * @param  array<string, string>  $cells
     */
    private function writeCells(string $xml, array $cells): string
    {
        $document = new DOMDocument;
        $document->preserveWhiteSpace = true;
        if (! $document->loadXML($xml)) {
            throw new WorkbookPatchFailed('The worksheet XML is malformed.');
        }
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('m', self::MAIN);

        foreach ($cells as $reference => $text) {
            $cell = self::cell($document, $xpath, $reference);
            while ($cell->firstChild !== null) {
                $cell->removeChild($cell->firstChild);
            }
            $cell->setAttribute('t', 'inlineStr');
            $inline = $document->createElementNS(self::MAIN, 'is');
            $value = $document->createElementNS(self::MAIN, 't');
            $value->setAttribute('xml:space', 'preserve');
            $value->appendChild($document->createTextNode(self::xmlSafe($text)));
            $inline->appendChild($value);
            $cell->appendChild($inline);
        }

        return (string) $document->saveXML();
    }

    /** The existing (styled) cell element, or a new one inserted in column order. */
    private static function cell(DOMDocument $document, DOMXPath $xpath, string $reference): DOMElement
    {
        $existing = self::first($xpath, "//m:sheetData/m:row/m:c[@r='{$reference}']");
        if ($existing instanceof DOMElement) {
            return $existing;
        }

        $rowNumber = (string) preg_replace('/^[A-Z]+/', '', $reference);
        $row = self::first($xpath, "//m:sheetData/m:row[@r='{$rowNumber}']");
        if (! $row instanceof DOMElement) {
            throw new WorkbookPatchFailed("Mapped row {$rowNumber} is missing from the template.");
        }
        $cell = $document->createElementNS(self::MAIN, 'c');
        $cell->setAttribute('r', $reference);
        foreach ($row->childNodes as $sibling) {
            if ($sibling instanceof DOMElement && self::columnIndex($sibling->getAttribute('r')) > self::columnIndex($reference)) {
                return $row->insertBefore($cell, $sibling);
            }
        }

        return $row->appendChild($cell);
    }

    private static function first(DOMXPath $xpath, string $query): ?DOMElement
    {
        $nodes = $xpath->query($query);
        $node = $nodes === false ? null : $nodes->item(0);

        return $node instanceof DOMElement ? $node : null;
    }

    private static function columnIndex(string $reference): int
    {
        $index = 0;
        foreach (str_split((string) preg_replace('/\d+/', '', $reference)) as $letter) {
            $index = $index * 26 + ord($letter) - 64;
        }

        return $index;
    }

    private static function hideSheet(string $xml, string $sheetName, int $activeIndex): string
    {
        $name = htmlspecialchars($sheetName, ENT_XML1);
        $patched = (string) preg_replace('/(<sheet name="'.preg_quote($name, '/').'" sheetId="\d+")/', '$1 state="hidden"', $xml, 1, $count);
        if ($count !== 1) {
            throw new WorkbookPatchFailed('The sheet to hide is missing from the template.');
        }

        return (string) preg_replace('/activeTab="\d+"/', "activeTab=\"{$activeIndex}\"", $patched, 1);
    }

    private static function selectTab(string $xml): string
    {
        return str_contains($xml, 'tabSelected="1"') ? $xml : (string) preg_replace('/<sheetView /', '<sheetView tabSelected="1" ', $xml, 1);
    }

    private static function checkCtrlProp(string $xml): string
    {
        return str_contains($xml, 'checked="Checked"') ? $xml : (string) preg_replace('/<formControlPr /', '<formControlPr checked="Checked" ', $xml, 1);
    }

    private static function checkShape(string $vml, int $shapeId): string
    {
        $pattern = '/(<v:shape id="_x0000_s'.$shapeId.'".*?<x:ClientData ObjectType="Checkbox">)(.*?)(<\/x:ClientData>)/s';
        $patched = (string) preg_replace_callback($pattern, fn (array $m): string => $m[1].(str_contains($m[2], '<x:Checked>') ? $m[2] : $m[2].'<x:Checked>1</x:Checked>').$m[3], $vml, 1, $count);
        if ($count !== 1) {
            throw new WorkbookPatchFailed("Checkbox shape {$shapeId} is missing from the template.");
        }

        return $patched;
    }

    private static function member(ZipArchive $zip, string $name): string
    {
        $content = $zip->getFromName($name);
        if ($content === false) {
            throw new WorkbookPatchFailed("Template member {$name} is missing.");
        }

        return $content;
    }

    /** Characters XML 1.0 cannot carry are dropped rather than corrupting the sheet. */
    private static function xmlSafe(string $text): string
    {
        return (string) preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $text);
    }

    /**
     * The same member list, every unowned member byte-identical, every owned XML well formed.
     *
     * @param  list<string>  $owned
     */
    private function validate(string $templatePath, string $outputPath, array $owned): void
    {
        $original = new ZipArchive;
        $patched = new ZipArchive;
        if ($original->open($templatePath) !== true || $patched->open($outputPath) !== true || $original->numFiles !== $patched->numFiles) {
            throw new WorkbookPatchFailed('The patched workbook lost or gained package members.');
        }

        try {
            for ($index = 0; $index < $original->numFiles; $index++) {
                $name = (string) $original->getNameIndex($index);
                $after = $patched->getFromName($name);
                if ($after === false) {
                    throw new WorkbookPatchFailed("Member {$name} is missing after patching.");
                }
                if (in_array($name, $owned, true)) {
                    if (! str_ends_with($name, '.vml') && @simplexml_load_string($after) === false) {
                        throw new WorkbookPatchFailed("Member {$name} is not well-formed XML after patching.");
                    }
                } elseif ($after !== $original->getFromName($name)) {
                    throw new WorkbookPatchFailed("Unowned member {$name} changed during patching.");
                }
            }
        } finally {
            $original->close();
            $patched->close();
        }
    }
}
