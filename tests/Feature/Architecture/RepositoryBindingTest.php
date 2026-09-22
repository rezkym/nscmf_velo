<?php

declare(strict_types=1);

use App\Repositories\Contracts\Audit\AccessAuditRepository;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentAccessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentBusinessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentSecurityAuditRepository;

/*
 * BE-022 AC-01 — the container resolves each repository contract to its real implementation.
 */

it('binds each repository contract to its Eloquent implementation', function (string $contract, string $implementation): void {
    expect(app($contract))->toBeInstanceOf($implementation);
})->with([
    [BusinessAuditRepository::class, EloquentBusinessAuditRepository::class],
    [AccessAuditRepository::class, EloquentAccessAuditRepository::class],
    [SecurityAuditRepository::class, EloquentSecurityAuditRepository::class],
]);
