<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Reports;

use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Models\Nscmf\NscmfRecord;
use App\Repositories\Contracts\Reports\ActivityLogRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-import-type LogFilters from \App\Domain\Reports\ActivityLogFilters
 */
final class EloquentActivityLogRepository implements ActivityLogRepository
{
    public function paginateEntries(int $viewerId, array $filters, int $page, int $perPage): LengthAwarePaginator
    {
        return self::ordered(self::matching($viewerId, $filters))->paginate(perPage: $perPage, page: $page);
    }

    public function summary(int $viewerId, array $filters): array
    {
        $row = self::matching($viewerId, $filters)
            ->toBase()
            // select() replaces the entry columns: only the aggregates remain.
            ->select([
                DB::raw('count(*) as total'),
                DB::raw('min(nscmf_records.request_date) as first_date'),
                DB::raw('max(nscmf_records.request_date) as last_date'),
            ])
            ->first();
        $impacts = DB::table('nscmf_change_service_impacts')
            ->whereIn('nscmf_record_id', self::matching($viewerId, $filters)->toBase()->select('nscmf_records.id'))
            ->whereIn('impact_code', ['NOC15', 'NOC23'])
            ->distinct()
            ->pluck('impact_code')
            ->all();

        $total = $row?->total;
        $first = $row?->first_date;
        $last = $row?->last_date;

        return [
            'total' => is_numeric($total) ? (int) $total : 0,
            'first_date' => is_string($first) ? $first : null,
            'last_date' => is_string($last) ? $last : null,
            'noc15' => in_array('NOC15', $impacts, true),
            'noc23' => in_array('NOC23', $impacts, true),
        ];
    }

    public function entries(int $viewerId, array $filters, int $limit): array
    {
        return array_values(self::ordered(self::matching($viewerId, $filters))->limit($limit)->get()->all());
    }

    public function entriesByIds(int $viewerId, array $recordIds): array
    {
        return array_values(self::ordered(self::visible($viewerId)->whereIn('nscmf_records.id', $recordIds))->get()->all());
    }

    public function serviceImpacts(array $recordIds): array
    {
        $impacts = [];
        foreach (DB::table('nscmf_change_service_impacts')->whereIn('nscmf_record_id', $recordIds)->get(['nscmf_record_id', 'impact_code']) as $row) {
            if (is_numeric($row->nscmf_record_id) && is_string($row->impact_code)) {
                $impacts[(int) $row->nscmf_record_id][] = $row->impact_code;
            }
        }

        return $impacts;
    }

    /**
     * Visible records (12 §17.1: a never-submitted record is its owner's only) with the two
     * form fields the log shows.
     *
     * @return Builder<NscmfRecord>
     */
    private static function visible(int $viewerId): Builder
    {
        return NscmfRecord::query()
            ->leftJoin('nscmf_activation_details', 'nscmf_activation_details.nscmf_record_id', '=', 'nscmf_records.id')
            ->leftJoin('nscmf_change_details', 'nscmf_change_details.nscmf_record_id', '=', 'nscmf_records.id')
            ->select('nscmf_records.*')
            ->addSelect([
                'nscmf_activation_details.customer_name as log_customer_name',
                'nscmf_change_details.maintenance_purpose as log_maintenance_purpose',
            ])
            ->where(fn (Builder $builder) => $builder
                ->where('nscmf_records.owner_user_id', $viewerId)
                ->orWhereNotIn('nscmf_records.business_status', [NscmfStatus::DRAFT->value, NscmfStatus::CANCELLED->value]));
    }

    /**
     * @param  LogFilters  $filters
     * @return Builder<NscmfRecord>
     */
    private static function matching(int $viewerId, array $filters): Builder
    {
        return self::visible($viewerId)
            ->whereIn('nscmf_records.business_status', $filters['statuses'])
            ->when($filters['archived'] !== 'all', fn (Builder $builder) => $builder->where('nscmf_records.is_archived', $filters['archived'] === 'archived'))
            ->when($filters['q'] !== null, fn (Builder $builder) => $builder->where('nscmf_records.request_no_normalized', 'like', '%'.mb_strtolower((string) $filters['q']).'%'))
            ->when($filters['family'] !== null, fn (Builder $builder) => $builder->where('nscmf_records.family', $filters['family']))
            ->when($filters['subtype'] !== null, fn (Builder $builder) => $builder->where('nscmf_records.subtype', $filters['subtype']))
            ->when($filters['request_date_from'] !== null, fn (Builder $builder) => $builder->where('nscmf_records.request_date', '>=', $filters['request_date_from']))
            ->when($filters['request_date_to'] !== null, fn (Builder $builder) => $builder->where('nscmf_records.request_date', '<=', $filters['request_date_to']));
    }

    /**
     * Log order: request date ascending with empty dates last, then Request No (12 §47.2).
     *
     * @param  Builder<NscmfRecord>  $query
     * @return Builder<NscmfRecord>
     */
    private static function ordered(Builder $query): Builder
    {
        return $query
            ->orderByRaw('nscmf_records.request_date is null')
            ->orderBy('nscmf_records.request_date')
            ->orderBy('nscmf_records.request_no')
            ->orderBy('nscmf_records.id');
    }
}
