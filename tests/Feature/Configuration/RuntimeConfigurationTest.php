<?php

declare(strict_types=1);

/*
 * Runtime configuration contract from 14_Environment_Specification.md (T04).
 */

it('uses Asia/Jakarta as the canonical application timezone', function (): void {
    expect(config('app.timezone'))->toBe('Asia/Jakarta');
});

it('connects to MySQL with utf8mb4, strict mode, and a +07:00 session timezone', function (): void {
    expect(config('database.default'))->toBe('mysql')
        ->and(config('database.connections.mysql.charset'))->toBe('utf8mb4')
        ->and(config('database.connections.mysql.collation'))->toBe('utf8mb4_0900_ai_ci')
        ->and(config('database.connections.mysql.strict'))->toBeTrue()
        ->and(config('database.connections.mysql.timezone'))->toBe('+07:00');
});

it('keeps sessions in the database with a 30-minute idle lifetime and safe cookie flags', function (): void {
    expect(config('session.driver'))->toBe('database')
        ->and(config('session.lifetime'))->toBe(30)
        ->and(config('session.expire_on_close'))->toBeFalse()
        ->and(config('session.http_only'))->toBeTrue()
        ->and(config('session.same_site'))->toBe('lax');
});

it('does not let the environment change the locked 30-minute session idle lifetime', function (): void {
    $_ENV['SESSION_LIFETIME'] = '120';
    putenv('SESSION_LIFETIME=120');

    try {
        $sessionConfig = require config_path('session.php');

        expect($sessionConfig)->toHaveKey('lifetime', 30);
    } finally {
        unset($_ENV['SESSION_LIFETIME']);
        putenv('SESSION_LIFETIME');
    }
});

it('stores cache in the database', function (): void {
    expect(config('cache.default'))->toBe('database');
});

it('dispatches database queue jobs only after the surrounding transaction commits', function (): void {
    expect(config('queue.default'))->toBe('database')
        ->and(config('queue.connections.database.after_commit'))->toBeTrue();
});

it('provides private NSCMF storage disks outside the public web root', function (): void {
    expect(config('filesystems.disks.nscmf_private'))->toMatchArray([
        'driver' => 'local',
        'root' => storage_path('app/private/nscmf'),
        'serve' => false,
        'visibility' => 'private',
    ])
        ->and(config('filesystems.disks.nscmf_runtime_tmp'))->toMatchArray([
            'driver' => 'local',
            'root' => storage_path('app/private/nscmf-runtime-tmp'),
            'serve' => false,
            'visibility' => 'private',
        ])
        ->and(str_starts_with(config()->string('filesystems.disks.nscmf_private.root'), public_path()))->toBeFalse()
        ->and(str_starts_with(config()->string('filesystems.disks.nscmf_runtime_tmp.root'), public_path()))->toBeFalse();
});

it('never serves private local storage over HTTP', function (): void {
    expect(config('filesystems.disks.local.serve'))->toBeFalse();
});
