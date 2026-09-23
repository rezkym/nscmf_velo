<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use stdClass;

final class EloquentRecordEvidenceRepository implements RecordEvidenceRepository
{
    public function timeline(int $recordId, int $page, int $perPage): LengthAwarePaginator
    {
        return DB::table('business_audit_events as events')
            ->leftJoin('users as actors', 'actors.id', '=', 'events.actor_user_id')
            ->leftJoin('nscmf_workflow_iterations as iterations', 'iterations.id', '=', 'events.workflow_iteration_id')
            ->where('events.nscmf_record_id', $recordId)
            ->orderByDesc('events.occurred_at')->orderByDesc('events.id')
            ->paginate($perPage, [
                'events.id', 'events.event_type', 'events.actor_type', 'actors.name as actor_name',
                'iterations.iteration_no', 'events.from_status', 'events.to_status', 'events.reason',
                'events.comment', 'events.record_version_before', 'events.record_version_after', 'events.occurred_at',
            ], 'page', $page);
    }

    public function changes(array $eventIds): array
    {
        return DB::table('business_audit_changes')->whereIn('business_audit_event_id', $eventIds)
            ->orderBy('id')->get(['business_audit_event_id', 'field_path', 'old_value_text', 'new_value_text'])->all();
    }

    public function attachments(int $recordId): array
    {
        return DB::table('nscmf_attachments')->where('nscmf_record_id', $recordId)->whereNull('removed_at')
            ->orderBy('id')->get(['id', 'original_filename', 'size_bytes', 'security_status', 'scanned_at', 'created_at'])->all();
    }

    public function attachment(int $recordId, int $attachmentId): ?stdClass
    {
        return DB::table('nscmf_attachments')->where('nscmf_record_id', $recordId)->where('id', $attachmentId)
            ->whereNull('removed_at')->first();
    }
}
