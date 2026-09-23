<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use stdClass;

interface RecordEvidenceRepository
{
    /** @return LengthAwarePaginator<int, stdClass> */
    public function timeline(int $recordId, int $page, int $perPage): LengthAwarePaginator;

    /** @param list<int> $eventIds
     * @return list<stdClass>
     */
    public function changes(array $eventIds): array;

    /** @return list<stdClass> */
    public function attachments(int $recordId): array;

    public function attachment(int $recordId, int $attachmentId): ?stdClass;
}
