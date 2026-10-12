<?php

declare(strict_types=1);

use App\Domain\Reports\ActivityLogMappingV1;

/*
 * T82B / G26 — mapping `nscmf-activity-log/v1` (02 BR-RPT-002, docs/activity-log-template-mapping.md).
 */

/**
 * @param  list<array{request_no: string, request_date: string|null, subtype: string, customer_name: string|null, noc_infrastructure: list<string>}>  $entries
 * @return array{header: array{period_from: string|null, period_until: string|null, site: array{noc15: bool, noc23: bool}, prepared_by: array{name: string|null, date: string|null}, acknowledged_by: array{name: string|null, date: string|null}}, entries: list<array{request_no: string, request_date: string|null, subtype: string, customer_name: string|null, noc_infrastructure: list<string>}>}
 */
function logSnapshot(
    array $entries,
    ?string $from = '2026-08-01',
    ?string $until = '2026-08-31',
    bool $noc15 = false,
    bool $noc23 = false,
    ?string $ackName = null,
    ?string $ackDate = null,
): array {
    return [
        'header' => [
            'period_from' => $from,
            'period_until' => $until,
            'site' => ['noc15' => $noc15, 'noc23' => $noc23],
            'prepared_by' => ['name' => 'Prepared Person', 'date' => '2026-08-31'],
            'acknowledged_by' => ['name' => $ackName, 'date' => $ackDate],
        ],
        'entries' => $entries,
    ];
}

/**
 * @param  list<string>  $impacts
 * @return array{request_no: string, request_date: string|null, subtype: string, customer_name: string|null, noc_infrastructure: list<string>}
 */
function logEntry(string $requestNo, string $subtype = 'ACTIVATION', ?string $customer = 'Demo Customer', array $impacts = [], ?string $date = '2026-08-03'): array
{
    return ['request_no' => $requestNo, 'request_date' => $date, 'subtype' => $subtype, 'customer_name' => $customer, 'noc_infrastructure' => $impacts];
}

it('fills one page: period dates as Excel serials, entry columns, signature block and no checkbox by default', function (): void {
    $fill = ActivityLogMappingV1::fill(logSnapshot([
        logEntry('DEMO-ACT-001'),
        logEntry('DEMO-CHG-002', 'MAINTENANCE', 'Demo migration of subnet', ['NOC15', 'NOC23'], '2026-08-04'),
    ]));

    expect($fill['rows'])->toBe(40)
        ->and($fill['controls'])->toBe([])
        ->and($fill['numbers'])->toMatchArray(['AG5' => 46235, 'AL5' => 46265, 'C9' => 46237, 'C10' => 46238, 'A54' => 46265])
        ->and($fill['text'])->toMatchArray([
            'G9' => 'DEMO-ACT-001', 'L9' => 'Activation', 'U9' => 'Demo Customer',
            'G10' => 'DEMO-CHG-002', 'L10' => 'Maintenance', 'U10' => 'Demo migration of subnet', 'AF10' => 'NOC15, NOC23',
            'A52' => 'Prepared Person',
        ])
        // Empty values are left out: the template cell stays blank.
        ->and($fill['text'])->not->toHaveKeys(['AF9', 'V52'])
        ->and($fill['numbers'])->not->toHaveKey('V54')
        ->and($fill['text'])->not->toHaveKey('C11');
});

it('labels every subtype the way the paper log does', function (string $subtype, string $label): void {
    expect(ActivityLogMappingV1::fill(logSnapshot([logEntry('X-1', $subtype)]))['text']['L9'])->toBe($label);
})->with([
    ['ACTIVATION', 'Activation'],
    ['UPGRADE_DOWNGRADE', 'Upgrade/Downgrade'],
    ['DEACTIVATION', 'Deactivation'],
    ['MAINTENANCE', 'Maintenance'],
    ['UPGRADE', 'Upgrade'],
    ['EMERGENCY', 'Emergency'],
]);

it('keeps Customer Name (42) and NOC Infrastructure (36) on one line, with the form\'s Service Impact labels', function (): void {
    $long = str_repeat('Demo very long purpose ', 5);
    $fill = ActivityLogMappingV1::fill(logSnapshot([
        logEntry('X-1', 'MAINTENANCE', "First line of the purpose\nsecond line never shown"),
        logEntry('X-2', 'MAINTENANCE', $long),
        logEntry('X-3', 'ACTIVATION', null),
    ]));

    $impacts = ActivityLogMappingV1::fill(logSnapshot([logEntry('X-4', 'MAINTENANCE', null, ['NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER'])]));
    expect($impacts['text']['AF9'])->toBe('NOC15, NOC23, NOC361, Regional, POP…')
        ->and(mb_strlen($impacts['text']['AF9']))->toBeLessThanOrEqual(36);

    expect($fill['text']['U9'])->toBe('First line of the purpose')
        ->and(mb_strlen($fill['text']['U10']))->toBe(42)
        ->and($fill['text']['U10'])->toEndWith('…')
        ->and($fill['text'])->not->toHaveKey('U11');
});

it('ticks the Site Location boxes the header asks for and writes the Acknowledge By block when given', function (): void {
    $fill = ActivityLogMappingV1::fill(logSnapshot([logEntry('X-1')], noc15: true, noc23: true, ackName: 'Acknowledging Person', ackDate: '2026-09-01'));

    expect($fill['controls'])->toBe([['ctrl_prop' => 1, 'shape' => 1025], ['ctrl_prop' => 2, 'shape' => 1026]])
        ->and($fill['text']['V52'])->toBe('Acknowledging Person')
        ->and($fill['numbers']['V54'])->toBe(46266);
});

it('continues past 40 entries on whole pages, numbering rows and moving the signature block down', function (): void {
    $entries = array_map(fn (int $n): array => logEntry("X-{$n}"), range(1, 41));
    $fill = ActivityLogMappingV1::fill(logSnapshot($entries));

    expect($fill['rows'])->toBe(80)
        ->and($fill['text']['G49'])->toBe('X-41')
        ->and($fill['numbers'])->toMatchArray(['A49' => 41, 'A88' => 80])
        ->and($fill['text']['A92'])->toBe('Prepared Person')
        ->and($fill['numbers']['A94'])->toBe(46265)
        ->and($fill['text'])->not->toHaveKey('A52');
});

it('leaves the period and an entry date empty when they are unknown', function (): void {
    $fill = ActivityLogMappingV1::fill(logSnapshot([logEntry('X-1', date: null)], from: null, until: null));

    expect($fill['numbers'])->not->toHaveKeys(['AG5', 'AL5', 'C9']);
});
