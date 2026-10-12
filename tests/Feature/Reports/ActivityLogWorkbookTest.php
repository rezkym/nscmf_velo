<?php

declare(strict_types=1);

use App\Domain\Reports\ActivityLogMappingV1;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Infrastructure\Workbook\ActivityLogWorkbookPatcher;
use Tests\Support\SyntheticLogWorkbook;

/*
 * T82B / G26 — targeted OOXML patch of the Activity Log workbook
 * (docs/activity-log-template-mapping.md, 16 §60A). The pipeline runs on the synthetic workbook;
 * cases about the real form need the private template and skip (never pass) without it.
 */

function logTemplate(): string
{
    return base_path('NSCMF-Log-Template.xlsx');
}

/** @return array<string, string> cell => inline text or numeric value */
function logCells(string $xlsx): array
{
    $xml = logMember($xlsx, 'xl/worksheets/sheet1.xml');
    preg_match_all('#<c r="([A-Z]+\d+)"[^>]*?(?:t="inlineStr"[^>]*><is><t[^>]*>(.*?)</t></is>|><v>([^<]*)</v>)</c>#s', $xml, $matches, PREG_SET_ORDER);

    return array_column(array_map(fn (array $m): array => [$m[1], ($m[2] ?? '') !== '' ? html_entity_decode($m[2]) : ($m[3] ?? '')], $matches), 1, 0);
}

function logMember(string $xlsx, string $name): string
{
    $zip = new ZipArchive;
    $zip->open($xlsx);
    $content = (string) $zip->getFromName($name);
    $zip->close();

    return $content;
}

/** @return list<string> */
function logMerges(string $xlsx): array
{
    preg_match_all('#<mergeCell ref="([^"]+)"/>#', logMember($xlsx, 'xl/worksheets/sheet1.xml'), $matches);

    return $matches[1];
}

/** @return array<string, mixed> */
function workbookSnapshot(int $entries, bool $noc15 = true): array
{
    return [
        'header' => [
            'period_from' => '2026-08-01', 'period_until' => '2026-08-31',
            'site' => ['noc15' => $noc15, 'noc23' => false],
            'prepared_by' => ['name' => 'Prepared Person', 'date' => '2026-08-31'],
            'acknowledged_by' => ['name' => 'Acknowledging Person', 'date' => '2026-09-01'],
        ],
        'entries' => array_map(fn (int $n): array => [
            'request_no' => sprintf('DEMO-LOG-%03d', $n), 'request_date' => '2026-08-03', 'subtype' => 'MAINTENANCE',
            'customer_name' => "Demo entry {$n}", 'noc_infrastructure' => ['NOC15'],
        ], range(1, $entries)),
    ];
}

function patchLog(string $template, int $entries, bool $noc15 = true): string
{
    $output = tempnam(sys_get_temp_dir(), 'log').'.xlsx';
    app(ActivityLogWorkbookPatcher::class)->patch($template, $output, ActivityLogMappingV1::fill(workbookSnapshot($entries, $noc15)));

    return $output;
}

it('fills one page in place and ticks only the requested checkbox, leaving every other member untouched', function (): void {
    $output = patchLog(SyntheticLogWorkbook::path(), 2);

    expect(logCells($output))->toMatchArray([
        'AG5' => '46235', 'AL5' => '46265', 'A9' => '1', 'C9' => '46237', 'G9' => 'DEMO-LOG-001', 'L9' => 'Maintenance',
        'U9' => 'Demo entry 1', 'AF9' => 'NOC15', 'G10' => 'DEMO-LOG-002', 'A52' => 'Prepared Person', 'V52' => 'Acknowledging Person',
        'A54' => '46265', 'V54' => '46266',
    ])
        ->and(logMember($output, 'xl/ctrlProps/ctrlProp1.xml'))->toContain('checked="Checked"')
        ->and(logMember($output, 'xl/ctrlProps/ctrlProp2.xml'))->not->toContain('checked=')
        ->and(logMember($output, 'xl/drawings/vmlDrawing1.vml'))->toMatch('#_x0000_s1025.*?<x:Checked>1</x:Checked>#s')
        ->and(logMember($output, 'xl/workbook.xml'))->toBe(logMember(SyntheticLogWorkbook::path(), 'xl/workbook.xml'))
        ->and(logMember($output, 'xl/sharedStrings.xml'))->toBe(logMember(SyntheticLogWorkbook::path(), 'xl/sharedStrings.xml'))
        ->and(logMember($output, 'xl/worksheets/sheet1.xml'))->not->toContain('<rowBreaks');
});

it('adds whole pages beyond 40 entries, moving the signature block and repeating the column headings', function (): void {
    $output = patchLog(SyntheticLogWorkbook::path(), 41);
    $cells = logCells($output);
    $sheet = logMember($output, 'xl/worksheets/sheet1.xml');
    $merges = logMerges($output);

    expect($cells)->toMatchArray(['A49' => '41', 'G49' => 'DEMO-LOG-041', 'A88' => '80', 'A92' => 'Prepared Person', 'A94' => '46265', 'V92' => 'Acknowledging Person'])
        ->and($cells)->not->toHaveKeys(['G50', 'A52'])
        ->and($merges)->toContain('A49:B49', 'AF49:AO49', 'U88:AE88', 'A90:U90', 'V90:AO90', 'A92:I92', 'V94:AD94')
        ->and($merges)->not->toContain('A52:I52', 'A50:U50')
        ->and($sheet)->toContain('<dimension ref="A1:AP94"/>')
        ->and($sheet)->toMatch('#<rowBreaks count="1" manualBreakCount="1"><brk id="48" max="16383" man="1"/></rowBreaks>#')
        ->and(preg_match_all('#<row r="(\d+)"#', $sheet, $rows))->toBe(94)
        ->and(logMember($output, 'xl/workbook.xml'))->toContain('<definedName name="_xlnm.Print_Titles" localSheetId="0">\'NSCMF-Log\'!$8:$8</definedName>');
});

it('fills the real log template with every value in its own input cell', function (): void {
    $output = patchLog(logTemplate(), 41, noc15: false);
    $cells = logCells($output);

    expect($cells)->toMatchArray(['G9' => 'DEMO-LOG-001', 'C9' => '46237', 'G49' => 'DEMO-LOG-041', 'A92' => 'Prepared Person'])
        ->and(logMember($output, 'xl/ctrlProps/ctrlProp1.xml'))->not->toContain('checked=')
        ->and(logMember($output, 'xl/sharedStrings.xml'))->toBe(logMember(logTemplate(), 'xl/sharedStrings.xml'))
        ->and(logMember($output, 'xl/drawings/drawing1.xml'))->toBe(logMember(logTemplate(), 'xl/drawings/drawing1.xml'));
})->skip(fn (): bool => ! is_file(logTemplate()), 'The private Activity Log template is not present.');

it('renders 41 entries of the real template as two A4 pages', function (): void {
    $output = patchLog(logTemplate(), 41);
    $workspace = sys_get_temp_dir().'/log-render-'.uniqid();
    mkdir($workspace);
    $pdf = app(SpreadsheetRenderer::class)->render($output, $workspace);

    expect(preg_match_all('#/Type\s*/Page[^s]#', (string) file_get_contents($pdf)))->toBe(2);
})->skip(fn (): bool => ! is_file(logTemplate()) || ! app(SpreadsheetRenderer::class)->isAvailable(), 'The private template or the renderer is not present.');
