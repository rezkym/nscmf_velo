<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Models\Nscmf\NscmfRecord;
use App\Models\Nscmf\WorkflowIteration;
use App\Repositories\Contracts\Nscmf\DashboardMetricsRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

final class EloquentDashboardMetricsRepository implements DashboardMetricsRepository
{
    public function createdPerDay(int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array
    {
        return $this->perDay($this->records($ownerUserId)->toBase(), 'created_at', $from, $through);
    }

    public function firstSubmittedPerDay(?int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array
    {
        return $this->perDay($this->records($ownerUserId)->toBase(), 'first_submitted_at', $from, $through);
    }

    public function approvalDecisionsPerDay(?int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array
    {
        // An approved iteration always belongs to a submitted record, so only the owner narrows it.
        $iterations = WorkflowIteration::query()
            ->join('nscmf_records', 'nscmf_records.id', '=', 'nscmf_workflow_iterations.nscmf_record_id')
            ->when($ownerUserId !== null, fn (Builder $query) => $query->where('nscmf_records.owner_user_id', $ownerUserId))
            ->toBase();

        return $this->perDay($iterations, 'nscmf_workflow_iterations.approved_at', $from, $through);
    }

    public function activeStatusCounts(?int $ownerUserId): array
    {
        return self::counts($this->records($ownerUserId)->toBase()
            ->where('is_archived', false)
            ->selectRaw('business_status AS label, COUNT(*) AS total')
            ->groupBy('business_status'));
    }

    /**
     * @return Builder<NscmfRecord>
     */
    private function records(?int $ownerUserId): Builder
    {
        return $ownerUserId === null
            ? NscmfRecord::query()->whereNotNull('first_submitted_at')
            : NscmfRecord::query()->where('owner_user_id', $ownerUserId);
    }

    /**
     * @param  literal-string  $column  a fixed column of this class, never request input
     * @return array<string, int>
     */
    private function perDay(QueryBuilder $query, string $column, CarbonImmutable $from, CarbonImmutable $through): array
    {
        return self::counts($query
            ->where($column, '>=', $from->startOfDay())
            ->where($column, '<', $through->addDay()->startOfDay())
            ->selectRaw('DATE('.$column.') AS label, COUNT(*) AS total')
            ->groupByRaw('DATE('.$column.')'));
    }

    /**
     * @return array<string, int>
     */
    private static function counts(QueryBuilder $query): array
    {
        $counts = [];

        foreach ($query->get() as $row) {
            if (is_string($row->label) && is_numeric($row->total)) {
                $counts[$row->label] = (int) $row->total;
            }
        }

        return $counts;
    }
}
