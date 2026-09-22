<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use App\Models\Audit\SecurityAuditEventRecord;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;

final class EloquentSecurityAuditRepository implements SecurityAuditRepository
{
    public function appendEvent(array $event): int
    {
        return SecurityAuditEventRecord::query()->create($event)->id;
    }
}
