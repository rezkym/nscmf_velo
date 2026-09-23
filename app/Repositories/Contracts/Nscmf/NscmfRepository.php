<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Models\Nscmf\NscmfRecord;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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

    public function find(int $id): ?NscmfRecord;

    /**
     * Records in one business state, newest-relevant order by the whitelisted sort, with the owner
     * and Team loaded. Archived records are excluded; Team is never a filter here.
     *
     * @param  array{page: int, per_page: int, sort: string, direction: string, q: string|null}  $query
     * @return LengthAwarePaginator<int, NscmfRecord>
     */
    public function paginateByStatus(NscmfStatus $status, array $query): LengthAwarePaginator;

    /**
     * @return array<string, int> status value => count of the actor's own records
     */
    public function countOwnByStatus(int $ownerUserId, NscmfStatus ...$statuses): array;

    public function countByStatus(NscmfStatus $status): int;

    /**
     * @return list<NscmfRecord>
     */
    public function recentOwnByStatus(int $ownerUserId, NscmfStatus $status, int $limit): array;

    /**
     * @return list<NscmfRecord>
     */
    public function recentByStatus(NscmfStatus $status, int $limit): array;

    /** The record with owner, Team, requester and current-iteration sign-off actors loaded. */
    public function findForProjection(int $id): ?NscmfRecord;

    /** Row-locks the record for a mutation (SELECT ... FOR UPDATE). */
    public function lockForUpdate(int $id): ?NscmfRecord;

    /**
     * The canonical typed family form data (12 §27–28 shape), collections in canonical order.
     *
     * @return array<string, mixed>
     */
    public function familyState(NscmfRecord $record): array;

    /**
     * @param  array<string, mixed>  $values  column => value on the family detail row
     */
    public function updateFamilyScalars(NscmfRecord $record, array $values): void;

    /**
     * Whole-set replacement of one collection (12 §7.4.1).
     *
     * @param  list<array<string, mixed>>  $rows
     */
    public function replaceCollection(NscmfRecord $record, string $collection, array $rows): void;

    /**
     * @param  array<string, mixed>|null  $fields  null deletes the 1:1 block; otherwise upsert the given columns
     */
    public function saveSite(NscmfRecord $record, string $site, ?array $fields): void;

    /**
     * Updates record columns and increments record_version by exactly one.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function updateAndIncrementVersion(NscmfRecord $record, array $attributes): void;
}
