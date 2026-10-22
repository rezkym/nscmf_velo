<?php

declare(strict_types=1);

namespace App\Infrastructure\Workbook;

use ZipArchive;

/**
 * ZipArchive + DOM patcher. Cells receive inline strings in their existing styled element, so
 * sharedStrings.xml and styles.xml are never rewritten; checkboxes are set in both their
 * ctrlProp and legacy VML shape; the other family's sheet is hidden in workbook.xml.
 */
final class OoxmlWorkbookPatcher implements WorkbookPatcher
{
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
            "xl/worksheets/{$fill['sheet']}.xml" => self::selectTab($this->writeCells(OoxmlPackage::member($zip, "xl/worksheets/{$fill['sheet']}.xml"), $fill['cells'])),
            'xl/workbook.xml' => self::hideSheet(OoxmlPackage::member($zip, 'xl/workbook.xml'), $fill['hidden_sheet'], $sheetNumber - 1),
        ];
        // A hidden sheet must not stay the selected tab.
        $other = OoxmlPackage::member($zip, $otherSheet);
        if (str_contains($other, ' tabSelected="1"')) {
            $changed[$otherSheet] = str_replace(' tabSelected="1"', '', $other);
        }
        $vmlName = "xl/drawings/vmlDrawing{$sheetNumber}.vml";
        $vml = OoxmlPackage::member($zip, $vmlName);
        foreach ($fill['controls'] as $control) {
            $ctrlProp = "xl/ctrlProps/ctrlProp{$control['ctrl_prop']}.xml";
            $changed[$ctrlProp] = OoxmlPackage::checkCtrlProp(OoxmlPackage::member($zip, $ctrlProp));
            $vml = OoxmlPackage::checkShape($vml, $control['shape']);
        }
        if ($fill['controls'] !== []) {
            $changed[$vmlName] = $vml;
        }

        foreach ($changed as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();

        OoxmlPackage::validate($templatePath, $outputPath, array_keys($changed));
    }

    /**
     * @param  array<string, string>  $cells
     */
    private function writeCells(string $xml, array $cells): string
    {
        $document = OoxmlPackage::load($xml);
        $xpath = OoxmlPackage::xpath($document);
        foreach ($cells as $reference => $text) {
            OoxmlPackage::writeText($document, $xpath, $reference, $text);
        }

        return (string) $document->saveXML();
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
}
