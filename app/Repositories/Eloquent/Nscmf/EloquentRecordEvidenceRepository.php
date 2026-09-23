<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Models\Audit\BusinessAuditEventRecord;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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
}
