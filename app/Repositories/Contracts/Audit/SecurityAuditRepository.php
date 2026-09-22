<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Audit;

interface SecurityAuditRepository
{
    /**
     * @param  array<string, mixed>  $event
     */
    public function appendEvent(array $event): int;
}
