<?php

declare(strict_types=1);

use App\Repositories\Contracts\Nscmf\NumberSequenceRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/*
 * BE-045 AC — the monthly counter is serialized by a MySQL row lock on a real second
 * connection, so two creators can never receive the same number (11 §15, 16 MySQL authority).
 */

it('makes a competing connection wait on the sequence row lock instead of reading a stale value', function (): void {
    $sequences = app(NumberSequenceRepository::class);
    config(['database.connections.second' => config('database.connections.mysql')]);
    $second = DB::connection('second');

    expect($sequences->next('209901'))->toBe(1)
        ->and($sequences->next('209901'))->toBe(2);

    $second->statement('SET SESSION innodb_lock_wait_timeout = 1');

    try {
        $second->transaction(fn () => $second->statement(
            'INSERT INTO nscmf_number_sequences (year_month, last_value, updated_at) VALUES (?, 1, NOW())
             ON DUPLICATE KEY UPDATE last_value = last_value + 1',
            ['209901'],
        ));
        $blocked = false;
    } catch (QueryException $exception) {
        $blocked = str_contains($exception->getMessage(), 'Lock wait timeout');
    } finally {
        $second->table('nscmf_number_sequences')->where('year_month', '209901')->delete();
        DB::purge('second');
    }

    expect($blocked)->toBeTrue();
});
