<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use App\Models\Audit\SecurityAuditEventRecord;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class EloquentSecurityAuditRepository implements SecurityAuditRepository
{
    public function appendEvent(array $event): int
    {
        return SecurityAuditEventRecord::query()->create($event)->id;
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        return AuditFilters::apply(DB::table('security_audit_events as events'), $filters)
            ->when($filters['outcome'] !== null, fn ($query) => $query->where('events.outcome', $filters['outcome']))
            ->leftJoin('users as actors', 'actors.id', '=', 'events.actor_user_id')
            ->leftJoin('users as targets', 'targets.id', '=', 'events.target_user_id')
            ->paginate($filters['per_page'], [
                'events.id', 'events.event_type', 'events.outcome', 'events.occurred_at', 'events.actor_user_id', 'actors.name as actor_name',
                'events.target_user_id', 'targets.name as target_name', 'events.subject_username', 'events.ip_address', 'events.nscmf_record_id',
            ], 'page', $filters['page']);
    }
}
