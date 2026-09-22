<?php

declare(strict_types=1);

use App\Support\Runtime\DisposableRuntimeGuard;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\PendingCommand;

/*
 * BE-005 / G08 — the browser runtime refuses any target that is not a disposable testing
 * database with isolated storage, before any reset or fixture write (16 §35).
 */

/**
 * @param  array<string, mixed>  $overrides
 * @return list<string>
 */
function guardProblems(array $overrides = []): array
{
    $values = array_merge([
        'environment' => 'testing',
        'driver' => 'mysql',
        'database' => 'nscmf_testing',
        'host' => '127.0.0.1',
        'storageRoots' => [storage_path('framework/testing/browser/private'), storage_path('framework/testing/browser/tmp')],
        'browser' => true,
    ], $overrides);
    // Relative roots in datasets resolve here, once the application (and storage_path) exists.
    $values['storageRoots'] = array_map(
        fn (string $root): string => str_starts_with($root, '/') ? $root : storage_path($root),
        $values['storageRoots'],
    );

    return DisposableRuntimeGuard::problems(...$values);
}

it('accepts only the disposable testing runtime', function (): void {
    expect(guardProblems())->toBe([]);
});

it('rejects each unsafe browser runtime', function (array $overrides, string $problem): void {
    expect(implode(' ', guardProblems($overrides)))->toContain($problem);
})->with([
    'local environment' => [['environment' => 'local'], 'APP_ENV'],
    'production environment' => [['environment' => 'production'], 'APP_ENV'],
    'development database' => [['database' => 'nscmf'], 'database'],
    'suffix lookalike' => [['database' => 'nscmf_testing_copy'], 'database'],
    'remote host' => [['host' => 'db.example.com'], 'host'],
    'sqlite driver' => [['driver' => 'sqlite'], 'MySQL'],
    'shared storage' => [['storageRoots' => ['app/private/nscmf']], 'storage'],
]);

it('does not require isolated storage roots for ordinary Pest runs', function (): void {
    expect(guardProblems(['browser' => false, 'storageRoots' => [storage_path('app/private/nscmf')]]))->toBe([]);
});

function prepareCommand(): PendingCommand
{
    $command = Pest\Laravel\artisan('nscmf:browser-testing:prepare');
    assert($command instanceof PendingCommand);

    return $command;
}

it('refuses to prepare unless the browser testing flag is set, before touching any table', function (): void {
    config(['nscmf.browser_testing' => false]);
    DB::table('teams')->insert(['name' => 'Survivor', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

    prepareCommand()->expectsOutputToContain('Refusing')->assertFailed();

    expect(DB::table('teams')->where('name', 'Survivor')->exists())->toBeTrue();
});

it('refuses to prepare against a non-disposable database name, before touching any table', function (): void {
    config(['nscmf.browser_testing' => true, 'database.connections.mysql.database' => 'nscmf_not_disposable']);

    prepareCommand()->expectsOutputToContain('database')->assertFailed();
});

it('refuses fixtures outside the browser runtime', function (): void {
    config(['nscmf.browser_testing' => false]);

    $command = Pest\Laravel\artisan('nscmf:browser-testing:user', ['--role' => ['Requester']]);
    assert($command instanceof PendingCommand);
    $command->assertFailed();

    expect(DB::table('users')->count())->toBe(0);
});
