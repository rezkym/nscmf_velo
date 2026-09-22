<?php

declare(strict_types=1);

namespace App\Providers;

use App\Repositories\Contracts\Audit\AccessAuditRepository;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentAccessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentBusinessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentSecurityAuditRepository;
use Illuminate\Support\ServiceProvider;

/** Explicit repository contract bindings (13 §25). */
class RepositoryServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    public array $bindings = [
        BusinessAuditRepository::class => EloquentBusinessAuditRepository::class,
        AccessAuditRepository::class => EloquentAccessAuditRepository::class,
        SecurityAuditRepository::class => EloquentSecurityAuditRepository::class,
    ];
}
