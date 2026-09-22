<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use App\Models\Audit\AccessAuditEventRecord;
use App\Repositories\Contracts\Audit\AccessAuditRepository;

final class EloquentAccessAuditRepository implements AccessAuditRepository
{
    public function appendEvent(array $event): int
    {
        return AccessAuditEventRecord::query()->create($event)->id;
    }
}
