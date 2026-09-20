<?php

declare(strict_types=1);

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
 * Real MySQL runtime behaviour required by 14_Environment_Specification.md §23 and §28.
 */

it('runs against MySQL 8.4', function (): void {
    expect(DB::scalar('select version()'))->toBeString()->toStartWith('8.4.');
});

it('sets the MySQL session timezone to +07:00 on the application connection', function (): void {
    expect(DB::scalar('select @@session.time_zone'))->toBe('+07:00');
});

it('evaluates NOW() in Asia/Jakarta business time', function (): void {
    $databaseNow = DB::scalar('select now()');

    if (! is_string($databaseNow)) {
        throw new UnexpectedValueException('MySQL NOW() did not return a datetime string.');
    }

    $difference = Carbon::parse($databaseNow, 'Asia/Jakarta')
        ->diffInSeconds(Carbon::now('Asia/Jakarta'), absolute: true);

    expect($difference)->toBeLessThan(60);
});

it('keeps MySQL strict SQL mode enabled', function (): void {
    expect(DB::scalar('select @@session.sql_mode'))->toBeString()->toContain('STRICT_TRANS_TABLES');
});
