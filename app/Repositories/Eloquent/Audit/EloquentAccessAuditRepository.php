<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use App\Models\Audit\AccessAuditEventRecord;
use App\Repositories\Contracts\Audit\AccessAuditRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class EloquentAccessAuditRepository implements AccessAuditRepository
{
    public function appendEvent(array $event): int
    {
        return AccessAuditEventRecord::query()->create($event)->id;
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        return AuditFilters::apply(DB::table('access_audit_events as events'), $filters)
            ->leftJoin('users as actors', 'actors.id', '=', 'events.actor_user_id')
            ->leftJoin('nscmf_records as records', 'records.id', '=', 'events.nscmf_record_id')
            ->paginate($filters['per_page'], [
                'events.id', 'events.event_type', 'events.occurred_at', 'events.actor_user_id', 'actors.name as actor_name',
                'events.nscmf_record_id', 'records.request_no', 'events.attachment_id', 'events.export_request_id',
            ], 'page', $filters['page']);
    }
}
