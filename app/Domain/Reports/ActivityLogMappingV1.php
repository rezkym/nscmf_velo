<?php

declare(strict_types=1);

namespace App\Domain\Reports;

use Carbon\CarbonImmutable;

/**
 * Mapping `nscmf-activity-log/v1` from an Activity Log snapshot to the log workbook
 * (docs/activity-log-template-mapping.md, 02 BR-RPT-002, G26). Pure data: which cell gets which
 * value. Pages hold 40 entry rows; rows past the first page are added below row 48 and the
 * signature block moves down with them. Empty values are left out so their cells stay blank.
 *
 * @phpstan-type LogControl array{ctrl_prop: int, shape: int}
 * @phpstan-type ActivityLogFill array{rows: int, text: array<string, string>, numbers: array<string, int>, controls: list<LogControl>}
 * @phpstan-type LogEntry array{request_no: string, request_date: string|null, subtype: string, customer_name: string|null, noc_infrastructure: list<string>}
 * @phpstan-type LogPerson array{name: string|null, date: string|null}
 * @phpstan-type LogHeader array{period_from: string|null, period_until: string|null, site: array{noc15: bool, noc23: bool}, prepared_by: LogPerson, acknowledged_by: LogPerson}
 * @phpstan-type LogSnapshot array{header: LogHeader, entries: list<LogEntry>}
 */
final class ActivityLogMappingV1
{
    public const string VERSION = 'nscmf-activity-log/v1';

    public const int ROWS_PER_PAGE = 40;

    public const int FIRST_ENTRY_ROW = 9;

    /** Customer Name stays inside its merged cell (a real render fits about 44 characters). */
    public const int MAX_TEXT = 42;

    /** The NOC Infrastructure cell is narrower. */
    public const int MAX_NOC_TEXT = 36;

    /** The form's Service Impact labels (07 §25). */
    private const array IMPACT_LABELS = [
        'NOC15' => 'NOC15', 'NOC23' => 'NOC23', 'NOC361' => 'NOC361', 'REGIONAL' => 'Regional',
        'POP' => 'POP', 'CUSTOMER' => 'Customer', 'OTHER' => 'Other',
    ];

    private const array SITE_CONTROLS = [
        'noc15' => ['ctrl_prop' => 1, 'shape' => 1025],
        'noc23' => ['ctrl_prop' => 2, 'shape' => 1026],
    ];

    private const array PURPOSES = [
        'ACTIVATION' => 'Activation',
        'UPGRADE_DOWNGRADE' => 'Upgrade/Downgrade',
        'DEACTIVATION' => 'Deactivation',
        'MAINTENANCE' => 'Maintenance',
        'UPGRADE' => 'Upgrade',
        'EMERGENCY' => 'Emergency',
    ];

    /** Signature block rows on a one-page sheet; they move down by the rows added. */
    private const int NAME_ROW = 52;

    private const int DATE_ROW = 54;

    /**
     * @param  LogSnapshot  $snapshot
     * @return ActivityLogFill
     */
    public static function fill(array $snapshot): array
    {
        $header = $snapshot['header'];
        $entries = $snapshot['entries'];
        $rows = self::ROWS_PER_PAGE * max(1, (int) ceil(count($entries) / self::ROWS_PER_PAGE));
        $shift = $rows - self::ROWS_PER_PAGE;
        $text = [];
        $numbers = [];

        self::date($numbers, 'AG5', $header['period_from']);
        self::date($numbers, 'AL5', $header['period_until']);

        for ($n = self::ROWS_PER_PAGE + 1; $n <= $rows; $n++) {
            $numbers['A'.(self::FIRST_ENTRY_ROW + $n - 1)] = $n;
        }
        foreach ($entries as $index => $entry) {
            $row = self::FIRST_ENTRY_ROW + $index;
            self::date($numbers, "C{$row}", $entry['request_date']);
            self::text($text, "G{$row}", $entry['request_no']);
            self::text($text, "L{$row}", self::PURPOSES[$entry['subtype']] ?? $entry['subtype']);
            self::text($text, "U{$row}", self::oneLine($entry['customer_name']));
            $impacts = array_map(fn (string $code): string => self::IMPACT_LABELS[$code] ?? $code, $entry['noc_infrastructure']);
            self::text($text, "AF{$row}", self::oneLine(implode(', ', $impacts), self::MAX_NOC_TEXT));
        }

        foreach (['A' => $header['prepared_by'], 'V' => $header['acknowledged_by']] as $column => $person) {
            self::text($text, $column.(self::NAME_ROW + $shift), $person['name']);
            self::date($numbers, $column.(self::DATE_ROW + $shift), $person['date']);
        }

        $controls = [];
        foreach (self::SITE_CONTROLS as $site => $control) {
            if ($header['site'][$site]) {
                $controls[] = $control;
            }
        }

        return ['rows' => $rows, 'text' => $text, 'numbers' => $numbers, 'controls' => $controls];
    }

    /** The first line, cut to $max characters with an ellipsis when longer. */
    public static function oneLine(?string $value, int $max = self::MAX_TEXT): string
    {
        $line = trim(strtok((string) $value, "\r\n") ?: '');

        return mb_strlen($line) > $max ? rtrim(mb_substr($line, 0, $max - 1)).'…' : $line;
    }

    /** @param array<string, string> $text */
    private static function text(array &$text, string $cell, ?string $value): void
    {
        if ($value !== null && trim($value) !== '') {
            $text[$cell] = $value;
        }
    }

    /**
     * A business date as an Excel 1900-system serial, so the template's date format shows it.
     *
     * @param  array<string, int>  $numbers
     */
    private static function date(array &$numbers, string $cell, ?string $date): void
    {
        if ($date !== null) {
            $numbers[$cell] = (int) CarbonImmutable::parse('1899-12-30', 'UTC')->diffInDays(CarbonImmutable::parse($date, 'UTC'));
        }
    }
}
