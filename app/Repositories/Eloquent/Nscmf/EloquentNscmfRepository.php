<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Domain\Nscmf\DraftStructure;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Models\Nscmf\NscmfRecord;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Exceptions\RequestNoTakenException;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class EloquentNscmfRepository implements NscmfRepository
{
    private const array DETAIL_TABLES = [
        'ACTIVATION' => 'nscmf_activation_details',
        'CHANGE' => 'nscmf_change_details',
    ];

    /** Collection/site tables; the ones marked true carry created_at/updated_at. */
    private const array CHILD_TABLES = [
        'references' => ['nscmf_activation_references', false],
        'service_blocks' => ['nscmf_activation_service_blocks', true],
        'sla_items' => ['nscmf_activation_sla_items', false],
        'virtual_connections' => ['nscmf_activation_virtual_connections', false],
        'priority_destinations' => ['nscmf_activation_priority_destinations', false],
        'facing_challenges' => ['nscmf_change_facing_challenges', false],
        'identified_problems' => ['nscmf_change_identified_problems', false],
        'service_impacts' => ['nscmf_change_service_impacts', false],
        'improvement_items' => ['nscmf_change_improvement_items', false],
        'results' => ['nscmf_change_results', true],
        'direct_site' => ['nscmf_activation_direct_site_details', true],
        'pop_site' => ['nscmf_activation_pop_site_details', true],
    ];

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

        DB::table(self::DETAIL_TABLES[$family->value])->insert([
            'nscmf_record_id' => $record->id,
            'created_at' => $record->created_at,
            'updated_at' => $record->updated_at,
        ]);

        return $record;
    }

    public function find(int $id): ?NscmfRecord
    {
        return NscmfRecord::query()->find($id);
    }

    public function lockForUpdate(int $id): ?NscmfRecord
    {
        return NscmfRecord::query()->lockForUpdate()->find($id);
    }

    public function familyState(NscmfRecord $record): array
    {
        $family = $record->family;
        $detail = (array) (DB::table(self::DETAIL_TABLES[$family->value])->where('nscmf_record_id', $record->id)->first() ?? []);
        $state = [];

        foreach (DraftStructure::scalars($family) as $field => $kind) {
            $state[$field] = self::cast($detail[$field] ?? null, $kind);
        }

        foreach (DraftStructure::collections($family) as $name => $definition) {
            $rows = DB::table(self::table($name))->where('nscmf_record_id', $record->id)->get()->map(fn (object $row): array => (array) $row)->all();
            $projected = array_map(function (array $row) use ($definition): array {
                $out = [$definition['key'] => $definition['max_row'] === null ? self::cast($row[$definition['key']] ?? null, DraftStructure::TEXT) : self::cast($row[$definition['key']] ?? null, DraftStructure::INTEGER)];
                foreach ($definition['fields'] as $field => $kind) {
                    $out[$field] = self::cast($row[$field] ?? null, $kind);
                }

                return $out;
            }, $rows);

            usort($projected, function (array $a, array $b) use ($definition): int {
                $key = $definition['key'];
                if ($definition['order'] !== []) {
                    return array_search($a[$key], $definition['order'], true) <=> array_search($b[$key], $definition['order'], true);
                }

                return $a[$key] <=> $b[$key];
            });
            $state[$name] = $projected;
        }

        foreach (DraftStructure::sites($family) as $site => $fields) {
            $row = DB::table(self::table($site))->where('nscmf_record_id', $record->id)->first();
            if ($row === null) {
                $state[$site] = null;

                continue;
            }

            $row = (array) $row;
            $state[$site] = [];
            foreach ($fields as $field => $kind) {
                $state[$site][$field] = self::cast($row[$field] ?? null, $kind);
            }
        }

        return $state;
    }

    public function updateFamilyScalars(NscmfRecord $record, array $values): void
    {
        if ($values === []) {
            return;
        }

        DB::table(self::DETAIL_TABLES[$record->family->value])
            ->where('nscmf_record_id', $record->id)
            ->update([...$values, 'updated_at' => CarbonImmutable::now()]);
    }

    public function replaceCollection(NscmfRecord $record, string $collection, array $rows): void
    {
        [$table, $timestamps] = self::CHILD_TABLES[$collection] ?? throw new RuntimeException("Unknown collection [{$collection}].");

        DB::table($table)->where('nscmf_record_id', $record->id)->delete();

        if ($rows === []) {
            return;
        }

        $now = CarbonImmutable::now();
        DB::table($table)->insert(array_map(
            fn (array $row): array => ['nscmf_record_id' => $record->id, ...$row, ...($timestamps ? ['created_at' => $now, 'updated_at' => $now] : [])],
            $rows,
        ));
    }

    public function saveSite(NscmfRecord $record, string $site, ?array $fields): void
    {
        $table = self::table($site);

        if ($fields === null) {
            DB::table($table)->where('nscmf_record_id', $record->id)->delete();

            return;
        }

        $now = CarbonImmutable::now();
        $exists = DB::table($table)->where('nscmf_record_id', $record->id)->exists();

        if ($exists) {
            DB::table($table)->where('nscmf_record_id', $record->id)->update([...$fields, 'updated_at' => $now]);

            return;
        }

        DB::table($table)->insert(['nscmf_record_id' => $record->id, ...$fields, 'created_at' => $now, 'updated_at' => $now]);
    }

    public function updateAndIncrementVersion(NscmfRecord $record, array $attributes): void
    {
        try {
            $updated = NscmfRecord::query()
                ->whereKey($record->id)
                ->where('record_version', $record->record_version)
                ->update([...$attributes, 'record_version' => $record->record_version + 1, 'updated_at' => CarbonImmutable::now()]);
        } catch (UniqueConstraintViolationException $exception) {
            throw new RequestNoTakenException('The request number is already used.', previous: $exception);
        }

        if ($updated !== 1) {
            throw new RuntimeException('The locked record version changed during the mutation.');
        }

        $record->refresh();
    }

    private static function table(string $name): string
    {
        return (self::CHILD_TABLES[$name] ?? throw new RuntimeException("Unknown child table [{$name}]."))[0];
    }

    private static function cast(mixed $value, string $kind): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($kind) {
            DraftStructure::DECIMAL => is_numeric($value) ? (float) $value : null,
            DraftStructure::INTEGER => is_numeric($value) ? (int) $value : null,
            DraftStructure::BOOLEAN => (bool) $value,
            default => is_scalar($value) ? (string) $value : null,
        };
    }
}
