<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use App\Models\Audit\BusinessAuditEventRecord;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface RecordEvidenceRepository
{
    /**
     * Business Timeline rows newest first, with actor, iteration and field changes loaded.
     *
     * @return LengthAwarePaginator<int, BusinessAuditEventRecord>
     */
    public function timeline(int $recordId, int $page, int $perPage): LengthAwarePaginator;
}
