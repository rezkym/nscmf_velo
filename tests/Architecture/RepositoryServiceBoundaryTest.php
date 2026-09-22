<?php

declare(strict_types=1);


/*
 * BE-022 / T05B — repository binding and the Controller → Service → Repository boundary
 * (12A, 13 §4, 15 Architecture-01).
 */

arch('controllers never query the database or call repositories directly')
    ->expect('App\Http\Controllers')
    ->not->toUse([
        'Illuminate\Support\Facades\DB',
        'Illuminate\Database\Eloquent\Builder',
        'Illuminate\Database\Query\Builder',
        'App\Repositories',
    ]);

arch('services never issue query-builder or Eloquent queries themselves')
    ->expect('App\Services')
    ->not->toUse([
        'Illuminate\Support\Facades\DB',
        'Illuminate\Database\Eloquent\Builder',
        'Illuminate\Database\Query\Builder',
        'App\Repositories\Eloquent',
    ]);

arch('jobs and console commands enter business execution through services')
    ->expect(['App\Jobs', 'App\Console'])
    ->not->toUse(['Illuminate\Support\Facades\DB', 'App\Repositories']);

arch('repository contracts are interfaces and implementations live under Eloquent')
    ->expect('App\Repositories\Contracts')
    ->toBeInterfaces();

arch('no Actions layer, DTO layer or generic BaseRepository exists')
    ->expect(['App\Actions', 'App\DTO', 'App\Dto', 'App\Repositories\BaseRepository'])
    ->not->toBeUsed();
