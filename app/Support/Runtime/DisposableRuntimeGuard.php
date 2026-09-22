<?php

declare(strict_types=1);

namespace App\Support\Runtime;

use RuntimeException;

/**
 * Refuses a testing runtime that could touch anything but a disposable MySQL database and, for the
 * served browser runtime, isolated private storage (16 §35, gap G08). It runs inside the served
 * process at boot and before every reset/fixture command, not only inside Pest.
 */
final class DisposableRuntimeGuard
{
    private const array LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

    /**
     * @param  list<string>  $storageRoots
     * @return list<string>
     */
    public static function problems(string $environment, string $driver, string $database, string $host, array $storageRoots, bool $browser): array
    {
        $problems = [];

        if ($environment !== 'testing') {
            $problems[] = "APP_ENV must be testing, not [{$environment}].";
        }

        if ($driver !== 'mysql') {
            $problems[] = 'The disposable runtime must use MySQL 8.4.';
        }

        if (! preg_match('/^[a-z0-9_]+_testing$/', $database)) {
            $problems[] = "The database [{$database}] is not a disposable *_testing database.";
        }

        if (! in_array($host, self::LOCAL_HOSTS, true)) {
            $problems[] = "The database host [{$host}] is not local.";
        }

        if ($browser) {
            $isolated = storage_path('framework/testing/browser');

            foreach ($storageRoots as $root) {
                if (! str_starts_with($root, $isolated.DIRECTORY_SEPARATOR)) {
                    $problems[] = "The private storage root [{$root}] is not isolated under {$isolated}.";
                }
            }
        }

        return $problems;
    }

    /**
     * @return list<string>
     */
    public static function currentProblems(): array
    {
        $connection = config()->string('database.default');

        return self::problems(
            app()->environment(),
            config()->string("database.connections.{$connection}.driver"),
            config()->string("database.connections.{$connection}.database"),
            config()->string("database.connections.{$connection}.host", ''),
            [config()->string('filesystems.disks.nscmf_private.root'), config()->string('filesystems.disks.nscmf_runtime_tmp.root')],
            config()->boolean('nscmf.browser_testing'),
        );
    }

    /** Boot-time check: any testing or browser runtime must be disposable. */
    public static function assertBootIsSafe(): void
    {
        if (! app()->environment('testing') && ! config()->boolean('nscmf.browser_testing')) {
            return;
        }

        $problems = self::currentProblems();

        if ($problems !== []) {
            throw new RuntimeException('Refusing to run a non-disposable testing runtime: '.implode(' ', $problems));
        }
    }
}
