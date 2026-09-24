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

    /**
     * A field's value at the moment the record last entered REVISION_REQUIRED, when it has been
     * changed since: the old value of its first recorded change after that event. Null when the
     * field was not changed since (or the record never entered revision).
     *
     * @return array{value: string|null}|null
     */
    public function valueAtLastReturnIfChanged(int $recordId, string $fieldPath): ?array;
}
