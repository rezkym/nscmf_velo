<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Reports;

use App\Models\Nscmf\NscmfRecord;
use App\Models\Reports\ActivityLogExport;
use Carbon\CarbonImmutable;
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

    /** @param array<string, mixed> $attributes */
    public function createExport(array $attributes): ActivityLogExport;

    public function findExport(int $exportId): ?ActivityLogExport;

    public function lockExport(int $exportId): ActivityLogExport;

    /** @param array<string, mixed> $attributes */
    public function updateExport(ActivityLogExport $export, array $attributes): void;

    /**
     * The requester's exports requested after $since and not expired, newest first.
     *
     * @return list<ActivityLogExport>
     */
    public function recentOwnExports(int $userId, CarbonImmutable $since, CarbonImmutable $now): array;

    /**
     * READY exports whose 168h window has passed and whose binary still exists.
     *
     * @return list<ActivityLogExport>
     */
    public function expiredExports(CarbonImmutable $now, int $limit): array;
}
