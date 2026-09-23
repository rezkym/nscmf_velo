<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Models\Audit\BusinessAuditEventRecord;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use stdClass;

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
