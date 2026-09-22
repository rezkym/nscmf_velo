<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use App\Models\Audit\BusinessAuditEventRecord;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use Illuminate\Support\Facades\DB;

final class EloquentBusinessAuditRepository implements BusinessAuditRepository
{
    public function appendEvent(array $event, array $changes): int
    {
        $record = BusinessAuditEventRecord::query()->create($event);

        if ($changes !== []) {
            DB::table('business_audit_changes')->insert(array_map(
                fn (array $change): array => ['business_audit_event_id' => $record->id, ...$change],
                $changes,
            ));
        }

        return $record->id;
    }
}
