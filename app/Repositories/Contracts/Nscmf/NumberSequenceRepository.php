<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

interface NumberSequenceRepository
{
    /** Atomically allocates the next value of the global monthly counter (11 §15). */
    public function next(string $yearMonth): int;
}
