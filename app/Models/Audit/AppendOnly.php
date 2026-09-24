<?php

declare(strict_types=1);

namespace App\Models\Audit;

use LogicException;

/**
 * Authoritative audit rows are append-only (11 §35, §38): normal application code can
 * neither edit nor delete them, and no age purge exists.
 */
trait AppendOnly
{
    protected static function bootAppendOnly(): void
    {
        static::updating(fn (): never => throw new LogicException('Authoritative audit rows are append-only.'));
        static::deleting(fn (): never => throw new LogicException('Authoritative audit rows are never deleted.'));
    }
}
