<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Models\Audit\BusinessAuditEventRecord;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class EloquentRecordEvidenceRepository implements RecordEvidenceRepository
{
    public function timeline(int $recordId, int $page, int $perPage): LengthAwarePaginator
    {
        return BusinessAuditEventRecord::query()
            ->with(['actor', 'iteration', 'changes'])
            ->where('nscmf_record_id', $recordId)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate(perPage: $perPage, page: $page);
    }

    public function valueAtLastReturnIfChanged(int $recordId, string $fieldPath): ?array
    {
        $returnedAt = DB::table('business_audit_events')
            ->where('nscmf_record_id', $recordId)
            ->where('to_status', 'REVISION_REQUIRED')
            // A transition into revision, not a save made while already in it.
            ->where(fn (Builder $query) => $query->whereNull('from_status')->orWhere('from_status', '!=', 'REVISION_REQUIRED'))
            ->max('id');
        if ($returnedAt === null) {
            return null;
        }

        $first = DB::table('business_audit_changes')
            ->join('business_audit_events', 'business_audit_events.id', '=', 'business_audit_changes.business_audit_event_id')
            ->where('business_audit_events.nscmf_record_id', $recordId)
            ->where('business_audit_events.id', '>', $returnedAt)
            ->where('business_audit_changes.field_path', $fieldPath)
            ->orderBy('business_audit_changes.id')
            ->first(['business_audit_changes.old_value_text']);
        if ($first === null) {
            return null;
        }
        $old = $first->old_value_text;

        return ['value' => is_string($old) ? $old : null];
    }
}
