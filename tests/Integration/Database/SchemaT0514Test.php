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

it('keeps queue and cache runtime tables in the database without Redis', function (): void {
    foreach (['jobs', 'job_batches', 'failed_jobs', 'cache', 'cache_locks'] as $table) {
        expect(Schema::tableExists($table))->toBeTrue();
    }

    expect(config('database.redis'))->toBeNull()
        ->and(config('cache.stores'))->not->toHaveKey('redis')
        ->and(config('queue.connections'))->not->toHaveKey('redis')
        ->and(config('session.driver'))->toBe('database')
        ->and(config('queue.default'))->toBe('database');
});
