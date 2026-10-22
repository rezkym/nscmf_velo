<?php

declare(strict_types=1);

namespace App\Domain\Reports;

use InvalidArgumentException;

/**
 * The immutable Activity Log export snapshot (11 §44A): what the worker reads back from JSON is
 * checked against the shape the mapping needs before any file is built.
 *
 * @phpstan-import-type LogSnapshot from ActivityLogMappingV1
 * @phpstan-import-type LogPerson from ActivityLogMappingV1
 */
final class ActivityLogSnapshot
{
    public const string SCHEMA = 'nscmf-activity-log-snapshot/1';

    /**
     * @param  array<mixed>  $stored
     * @return LogSnapshot
     *
     * @throws InvalidArgumentException when the stored snapshot does not have the expected shape
     */
    public static function fromStored(array $stored): array
    {
        $header = self::map($stored['header'] ?? null);
        $site = self::map($header['site'] ?? null);
        $entries = [];
        foreach (self::list($stored['entries'] ?? null) as $entry) {
            $entry = self::map($entry);
            $impacts = array_map(fn (mixed $code): string => is_string($code) ? $code : throw new InvalidArgumentException('Bad impact.'), self::list($entry['noc_infrastructure'] ?? null));
            $entries[] = [
                'request_no' => self::string($entry['request_no'] ?? null),
                'request_date' => self::nullableString($entry['request_date'] ?? null),
                'subtype' => self::string($entry['subtype'] ?? null),
                'customer_name' => self::nullableString($entry['customer_name'] ?? null),
                'noc_infrastructure' => $impacts,
            ];
        }
        if ($entries === []) {
            throw new InvalidArgumentException('A snapshot holds at least one entry.');
        }

        return [
            'header' => [
                'period_from' => self::nullableString($header['period_from'] ?? null),
                'period_until' => self::nullableString($header['period_until'] ?? null),
                'site' => ['noc15' => ($site['noc15'] ?? null) === true, 'noc23' => ($site['noc23'] ?? null) === true],
                'prepared_by' => self::person($header['prepared_by'] ?? null),
                'acknowledged_by' => self::person($header['acknowledged_by'] ?? null),
            ],
            'entries' => $entries,
        ];
    }

    /** @return LogPerson */
    private static function person(mixed $value): array
    {
        $person = self::map($value);

        return ['name' => self::nullableString($person['name'] ?? null), 'date' => self::nullableString($person['date'] ?? null)];
    }

    /** @return array<mixed> */
    private static function map(mixed $value): array
    {
        return is_array($value) ? $value : throw new InvalidArgumentException('Expected an object.');
    }

    /** @return list<mixed> */
    private static function list(mixed $value): array
    {
        return is_array($value) && array_is_list($value) ? $value : throw new InvalidArgumentException('Expected a list.');
    }

    private static function string(mixed $value): string
    {
        return is_string($value) ? $value : throw new InvalidArgumentException('Expected a string.');
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : self::string($value);
    }
}
