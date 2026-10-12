<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Reports;

use App\Models\Nscmf\NscmfRecord;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Activity Log entries (12 §47.2): records visible to the viewer (12 §17.1) in log order, each
 * carrying `log_customer_name` (Activation) and `log_maintenance_purpose` (Change).
 *
 * @phpstan-import-type LogFilters from \App\Domain\Reports\ActivityLogFilters
 */
interface ActivityLogRepository
{
    /**
     * @param  LogFilters  $filters
     * @return LengthAwarePaginator<int, NscmfRecord>
     */
    public function paginateEntries(int $viewerId, array $filters, int $page, int $perPage): LengthAwarePaginator;

    /**
     * Count, first and last request date of every matching entry, and whether any of them has
     * the NOC15 / NOC23 Service Impact.
     *
     * @param  LogFilters  $filters
     * @return array{total: int, first_date: string|null, last_date: string|null, noc15: bool, noc23: bool}
     */
    public function summary(int $viewerId, array $filters): array;

    /**
     * At most $limit matching entries in log order.
     *
     * @param  LogFilters  $filters
     * @return list<NscmfRecord>
     */
    public function entries(int $viewerId, array $filters, int $limit): array;

    /**
     * The given records that are visible to the viewer, in log order.
     *
     * @param  list<int>  $recordIds
     * @return list<NscmfRecord>
     */
    public function entriesByIds(int $viewerId, array $recordIds): array;

    /**
     * Service Impact codes per record.
     *
     * @param  list<int>  $recordIds
     * @return array<int, list<string>>
     */
    public function serviceImpacts(array $recordIds): array;
}
