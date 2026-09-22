<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Models\Nscmf\NscmfRecord;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Exceptions\RequestNoTakenException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class EloquentNscmfRepository implements NscmfRepository
{
    public function requestNoExists(string $normalized, ?int $exceptRecordId = null): bool
    {
        return NscmfRecord::query()
            ->where('request_no_normalized', $normalized)
            ->when($exceptRecordId !== null, fn ($query) => $query->where('id', '!=', $exceptRecordId))
            ->exists();
    }

    public function createWithDetail(array $attributes, NscmfFamily $family): NscmfRecord
    {
        try {
            $record = NscmfRecord::query()->create($attributes);
        } catch (UniqueConstraintViolationException $exception) {
            throw new RequestNoTakenException('The request number is already used.', previous: $exception);
        }

        DB::table($family === NscmfFamily::ACTIVATION ? 'nscmf_activation_details' : 'nscmf_change_details')->insert([
            'nscmf_record_id' => $record->id,
            'created_at' => $record->created_at,
            'updated_at' => $record->updated_at,
        ]);

        return $record;
    }
}
