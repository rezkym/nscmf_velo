<?php

declare(strict_types=1);

use Tests\Support\Schema;

/*
 * BE-020 / T05-14 — framework runtime tables (11 §50–51).
 */

it('keeps database sessions with an explicit absolute-lifetime anchor', function (): void {
    $columns = Schema::columns('sessions');

    expect($columns)->toHaveKeys(['id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity', 'authenticated_at'])
        ->and($columns['authenticated_at']['nullable'])->toBeTrue()
        ->and(Schema::indexes('sessions'))->toHaveKey('sessions_authenticated_at_index')
        ->and(Schema::indexes('sessions'))->toHaveKey('sessions_user_id_index');
});

it('keeps queue and cache runtime tables in the database and selects Redis nowhere', function (): void {
    foreach (['jobs', 'job_batches', 'failed_jobs', 'cache', 'cache_locks'] as $table) {
        expect(Schema::tableExists($table))->toBeTrue();
    }

    // Laravel 13 always merges the framework's own inert Redis defaults into config, so the
    // contract is that no application setting selects or configures Redis (AGENTS.md).
    $appConfig = implode("\n", array_map('file_get_contents', glob(config_path('*.php')) ?: []));

    expect(config('session.driver'))->toBe('database')
        ->and(config('cache.default'))->toBe('database')
        ->and(config('queue.default'))->toBe('database')
        ->and(config('queue.failed.driver'))->toBe('database-uuids')
        ->and($appConfig)->not->toContain("'driver' => 'redis'")
        ->and($appConfig)->not->toContain('REDIS_');
});
