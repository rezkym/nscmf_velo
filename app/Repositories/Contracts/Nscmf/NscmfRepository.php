<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Models\Nscmf\NscmfRecord;

interface NscmfRepository
{
    public function requestNoExists(string $normalized, ?int $exceptRecordId = null): bool;

    /**
     * Inserts the record and its empty 1:1 family detail row. A request-number clash raises
     * App\Repositories\Exceptions\RequestNoTakenException rather than a raw database error.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createWithDetail(array $attributes, NscmfFamily $family): NscmfRecord;
}
