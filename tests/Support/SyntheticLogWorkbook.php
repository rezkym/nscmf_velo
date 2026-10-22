<?php

declare(strict_types=1);

namespace Tests\Support;

use RuntimeException;
use ZipArchive;

/**
 * A structurally valid stand-in for the Activity Log workbook (docs/activity-log-template-mapping.md):
 * one sheet "NSCMF-Log" with the header row, 40 numbered entry rows, the signature block rows,
 * their merges, both checkboxes and a shared-strings part. It lets the report pipeline run where
 * the private template is absent (CI); layout against the real form needs the real template.
 */
final class SyntheticLogWorkbook
{
    private const array ENTRY_MERGES = ['A:B', 'C:F', 'G:K', 'L:T', 'U:AE', 'AF:AO'];

    /** Builds the workbook once per process and returns its path. */
    public static function path(): string
    {
        static $path = null;
        if (is_string($path) && is_file($path)) {
            return $path;
        }

        $path = sys_get_temp_dir().'/nscmf-synthetic-log-'.getmypid().'.xlsx';
        @unlink($path);
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::CREATE) !== true) {
            throw new RuntimeException('Could not build the synthetic log workbook.');
        }
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="NSCMF-Log" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>');
        $zip->addFromString('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            .'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1"><si><t>No</t></si></sst>');
        $zip->addFromString('xl/worksheets/sheet1.xml', self::sheet());
        $zip->addFromString('xl/drawings/vmlDrawing1.vml', '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:x="urn:schemas-microsoft-com:office:excel">'
            .'<v:shape id="_x0000_s1025" type="#_x0000_t201"><x:ClientData ObjectType="Checkbox"><x:AutoFill>False</x:AutoFill></x:ClientData></v:shape>'
            .'<v:shape id="_x0000_s1026" type="#_x0000_t201"><x:ClientData ObjectType="Checkbox"><x:AutoFill>False</x:AutoFill></x:ClientData></v:shape></xml>');
        foreach ([1, 2] as $number) {
            $zip->addFromString("xl/ctrlProps/ctrlProp{$number}.xml", '<?xml version="1.0" encoding="UTF-8"?>'
                .'<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="CheckBox" lockText="1"/>');
        }
        $zip->close();

        return $path;
    }

    private static function sheet(): string
    {
        $rows = '';
        for ($row = 1; $row <= 54; $row++) {
            $cells = '';
            if ($row === 8) {
                $cells = '<c r="A8" s="1" t="s"><v>0</v></c>';
            } elseif ($row >= 9 && $row <= 48) {
                $cells = '<c r="A'.$row.'" s="2"><v>'.($row - 8).'</v></c>';
                foreach (['C', 'G', 'L', 'U', 'AF'] as $column) {
                    $cells .= "<c r=\"{$column}{$row}\" s=\"3\"/>";
                }
            } elseif (in_array($row, [5, 52, 54], true)) {
                foreach ($row === 5 ? ['AG', 'AL'] : ['A', 'V'] as $column) {
                    $cells .= "<c r=\"{$column}{$row}\" s=\"4\"/>";
                }
            }
            $rows .= "<row r=\"{$row}\" ht=\"13.5\">{$cells}</row>";
        }

        $merges = ['A50:U50', 'V50:AO50', 'A52:I52', 'V52:AD52', 'A54:I54', 'V54:AD54'];
        for ($row = 8; $row <= 48; $row++) {
            foreach (self::ENTRY_MERGES as $span) {
                [$from, $to] = explode(':', $span);
                $merges[] = "{$from}{$row}:{$to}{$row}";
            }
        }
        $mergeCells = implode('', array_map(fn (string $ref): string => "<mergeCell ref=\"{$ref}\"/>", $merges));

        return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<dimension ref="A1:AP54"/><sheetViews><sheetView workbookViewId="0"/></sheetViews>'
            ."<sheetData>{$rows}</sheetData>"
            .'<mergeCells count="'.count($merges).'">'.$mergeCells.'</mergeCells>'
            .'<pageMargins left="0.8" right="0.4" top="0.5" bottom="0.25" header="0" footer="0"/><pageSetup paperSize="9" orientation="portrait"/></worksheet>';
    }
}
