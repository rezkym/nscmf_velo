<?php

declare(strict_types=1);

use Symfony\Component\Finder\Finder;

/*
 * BE-142 / T74 — Controller → Service → Repository contracts (09, 12A, 15 Architecture-01).
 * Persistence stays in repositories; no Actions, DTO or BaseRepository layer exists.
 */

/** @return array<string, list<string>> relative file => imported class names */
function importsUnder(string $directory): array
{
    $imports = [];
    foreach ((new Finder)->files()->in(base_path($directory))->name('*.php') as $file) {
        preg_match_all('/^use ([A-Za-z0-9_\\\\]+)(?: as \w+)?;/m', $file->getContents(), $matches);
        $imports[$directory.'/'.$file->getRelativePathname()] = $matches[1];
    }

    return $imports;
}

it('keeps each layer away from the persistence it must not touch', function (string $directory, array $forbidden): void {
    $violations = [];
    foreach (importsUnder($directory) as $file => $imports) {
        foreach ($imports as $import) {
            foreach ($forbidden as $prefix) {
                if (is_string($prefix) && str_starts_with($import, $prefix)) {
                    $violations[] = "{$file} uses {$import}";
                }
            }
        }
    }

    expect($violations)->toBe([]);
})->with([
    'controllers' => ['app/Http/Controllers', ['Illuminate\Support\Facades\DB', 'Illuminate\Database\Eloquent\Builder', 'Illuminate\Database\Query\Builder', 'App\Repositories']],
    'services' => ['app/Services', ['Illuminate\Support\Facades\DB', 'Illuminate\Database\Eloquent\Builder', 'Illuminate\Database\Query\Builder', 'App\Repositories\Eloquent']],
    'jobs' => ['app/Jobs', ['Illuminate\Support\Facades\DB', 'App\Repositories']],
    'commands' => ['app/Console/Commands', ['Illuminate\Support\Facades\DB', 'App\Repositories']],
    'domain' => ['app/Domain', ['Illuminate\Support\Facades\DB', 'Illuminate\Database', 'App\Repositories', 'App\Services', 'App\Http']],
]);

it('never calls Eloquent query builders from controllers or services', function (): void {
    $hits = [];
    foreach (['app/Http/Controllers', 'app/Services'] as $directory) {
        foreach ((new Finder)->files()->in(base_path($directory))->name('*.php') as $file) {
            if (preg_match('/::query\(\)|DB::/', $file->getContents()) === 1) {
                $hits[] = $directory.'/'.$file->getRelativePathname();
            }
        }
    }

    expect($hits)->toBe([]);
});

it('has no speculative Actions, DTO or BaseRepository layer', function (): void {
    foreach (['app/Actions', 'app/DTO', 'app/Data'] as $directory) {
        expect(is_dir(base_path($directory)))->toBeFalse();
    }
    $baseRepositories = [];
    foreach ((new Finder)->files()->in(app_path())->name('*.php') as $file) {
        if (str_contains($file->getContents(), 'BaseRepository')) {
            $baseRepositories[] = $file->getRelativePathname();
        }
    }
    expect($baseRepositories)->toBe([]);
});

it('declares strict types in every project PHP file', function (): void {
    $missing = [];
    foreach (['app', 'database', 'routes', 'config', 'tests'] as $directory) {
        foreach ((new Finder)->files()->in(base_path($directory))->name('*.php') as $file) {
            if (! str_contains($file->getContents(), 'declare(strict_types=1);')) {
                $missing[] = $directory.'/'.$file->getRelativePathname();
            }
        }
    }

    expect($missing)->toBe([]);
});

it('never lets cleanup or settings code depend on authoritative audit tables', function (string $file): void {
    $source = (string) file_get_contents(base_path($file));

    foreach (['BusinessAuditRepository', 'AccessAuditRepository', 'business_audit_events', 'access_audit_events'] as $forbidden) {
        expect(str_contains($source, $forbidden))->toBeFalse();
    }
})->with(['app/Services/Maintenance/CleanupService.php', 'app/Services/Settings/SystemSettingsService.php']);
