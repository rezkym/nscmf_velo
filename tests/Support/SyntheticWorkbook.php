<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Export\NscmfFormMappingV1;
use ReflectionClass;
use RuntimeException;
use ZipArchive;

/**
 * A structurally valid stand-in for the official workbook, built from nothing but the mapping's
 * public shape: both family sheets, every checkbox's ctrlProp and VML shape, and empty rows.
 *
 * It lets the export pipeline (registry, queue, snapshot, download, batch ZIP, retries) be tested
 * where the private official workbook is absent — CI in particular. Layout and fidelity against
 * the real form stay proven with the official workbook only (ExportTest, PDF tests).
 */
final class SyntheticWorkbook
{
    private const int ROWS = 120;

    /** Builds the workbook once per process and returns its path. */
    public static function path(): string
    {
        static $path = null;
        if (is_string($path) && is_file($path)) {
            return $path;
        }

        $path = sys_get_temp_dir().'/nscmf-synthetic-'.getmypid().'.xlsx';
        @unlink($path);
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::CREATE) !== true) {
            throw new RuntimeException('Could not build the synthetic workbook.');
        }

        [$ctrlProps, $shapes] = self::controls();
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'
            .'<sheet name="NSCMF - Activation" sheetId="8"/><sheet name="NSCMF - Change" sheetId="9"/></sheets></workbook>');
        foreach ([1, 2] as $sheet) {
            $zip->addFromString("xl/worksheets/sheet{$sheet}.xml", self::sheet());
            $zip->addFromString("xl/drawings/vmlDrawing{$sheet}.vml", self::vml($shapes));
        }
        foreach ($ctrlProps as $number) {
            $zip->addFromString("xl/ctrlProps/ctrlProp{$number}.xml", '<?xml version="1.0" encoding="UTF-8"?>'
                .'<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="CheckBox" lockText="1"/>');
        }
        $zip->close();

        return $path;
    }

    private static function sheet(): string
    {
        $rows = '';
        for ($row = 1; $row <= self::ROWS; $row++) {
            $rows .= "<row r=\"{$row}\"/>";
        }

        return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            ."<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews><sheetData>{$rows}</sheetData></worksheet>";
    }

    /** @param list<int> $shapes */
    private static function vml(array $shapes): string
    {
        $body = '';
        foreach ($shapes as $id) {
            $body .= "<v:shape id=\"_x0000_s{$id}\" type=\"#_x0000_t201\"><x:ClientData ObjectType=\"Checkbox\"><x:AutoFill>False</x:AutoFill></x:ClientData></v:shape>";
        }

        return '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:x="urn:schemas-microsoft-com:office:excel">'.$body.'</xml>';
    }

    /**
     * Every [ctrlProp, shape] pair the mapping can tick.
     *
     * @return array{0: list<int>, 1: list<int>}
     */
    private static function controls(): array
    {
        $pairs = [];
        $walk = static function (mixed $value) use (&$walk, &$pairs): void {
            if (! is_array($value)) {
                return;
            }
            if (array_is_list($value) && count($value) === 2 && is_int($value[0]) && is_int($value[1]) && $value[1] > 1000) {
                $pairs[] = $value;

                return;
            }
            foreach ($value as $item) {
                $walk($item);
            }
        };
        foreach ((new ReflectionClass(NscmfFormMappingV1::class))->getConstants() as $constant) {
            $walk($constant);
        }

        return [
            array_values(array_unique(array_column($pairs, 0))),
            array_values(array_unique(array_column($pairs, 1))),
        ];
    }
}
