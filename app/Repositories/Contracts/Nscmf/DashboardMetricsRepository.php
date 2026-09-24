<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use Carbon\CarbonImmutable;

/**
 * Read-only counts behind the Dashboard analytics (12 §44.1). Nothing here returns a record.
 *
 * `$ownerUserId` scopes the counts to that actor's own records; null means the organization,
 * which only ever covers records submitted at least once (12 §17.1). Days are calendar dates
 * of the stored application-timezone wall time, keyed `Y-m-d`; days without rows are absent.
 */
interface DashboardMetricsRepository
{
    /**
     * @return array<string, int>
     */
    public function createdPerDay(int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array;

    /**
     * @return array<string, int>
     */
    public function firstSubmittedPerDay(?int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array;

    /**
     * Every approved workflow iteration is one decision, so a re-approval after Reopen counts again.
     *
     * @return array<string, int>
     */
    public function approvalDecisionsPerDay(?int $ownerUserId, CarbonImmutable $from, CarbonImmutable $through): array;

    /**
     * Unarchived records per business status value; statuses without rows are absent.
     *
     * @return array<string, int>
     */
    public function activeStatusCounts(?int $ownerUserId): array;
}
