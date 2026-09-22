<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Repositories\Contracts\Nscmf\NumberSequenceRepository;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * One statement both creates the month row and increments it under InnoDB's row lock;
 * LAST_INSERT_ID(expr) returns this connection's value without a second racy read.
 */
final class MySqlNumberSequenceRepository implements NumberSequenceRepository
{
    public function next(string $yearMonth): int
    {
        DB::statement(
            'INSERT INTO nscmf_number_sequences (`year_month`, `last_value`, `updated_at`) VALUES (?, LAST_INSERT_ID(1), NOW())
             ON DUPLICATE KEY UPDATE `last_value` = LAST_INSERT_ID(`last_value` + 1), updated_at = NOW()',
            [$yearMonth],
        );

        $value = DB::scalar('SELECT LAST_INSERT_ID()');

        if (! is_numeric($value) || (int) $value < 1) {
            throw new RuntimeException('The monthly number sequence did not return a value.');
        }

        return (int) $value;
    }
}
