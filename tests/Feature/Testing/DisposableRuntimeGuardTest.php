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
 * @param  list<string>  $storageRoots  relative roots resolve under storage_path()
 * @return list<string>
 */
function guardProblems(
    string $environment = 'testing',
    string $driver = 'mysql',
    string $database = 'nscmf_testing',
    string $host = '127.0.0.1',
    array $storageRoots = ['framework/testing/browser/private', 'framework/testing/browser/tmp'],
    bool $browser = true,
): array {
    return DisposableRuntimeGuard::problems(
        $environment,
        $driver,
        $database,
        $host,
        array_map(fn (string $root): string => storage_path($root), $storageRoots),
        $browser,
    );
}

it('accepts only the disposable testing runtime', function (): void {
    expect(guardProblems())->toBe([]);
});

it('rejects each unsafe browser runtime', function (Closure $problems, string $problem): void {
    expect((string) json_encode($problems()))->toContain($problem);
})->with([
    'local environment' => [fn () => guardProblems(environment: 'local'), 'APP_ENV'],
    'production environment' => [fn () => guardProblems(environment: 'production'), 'APP_ENV'],
    'development database' => [fn () => guardProblems(database: 'nscmf'), 'database'],
    'suffix lookalike' => [fn () => guardProblems(database: 'nscmf_testing_copy'), 'database'],
    'remote host' => [fn () => guardProblems(host: 'db.example.com'), 'host'],
    'sqlite driver' => [fn () => guardProblems(driver: 'sqlite'), 'MySQL'],
    'shared storage' => [fn () => guardProblems(storageRoots: ['app/private/nscmf']), 'storage'],
]);

it('does not require isolated storage roots for ordinary Pest runs', function (): void {
    expect(guardProblems(browser: false, storageRoots: ['app/private/nscmf']))->toBe([]);
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
