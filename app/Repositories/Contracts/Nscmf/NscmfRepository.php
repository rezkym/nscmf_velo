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

    public function find(int $id): ?NscmfRecord;

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
