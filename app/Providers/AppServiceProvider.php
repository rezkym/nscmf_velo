<?php

declare(strict_types=1);

namespace App\Providers;

use App\Infrastructure\Malware\ClamdScanner;
use App\Infrastructure\Malware\MalwareScanner;
use App\Infrastructure\Session\AnchoredDatabaseSessionHandler;
use App\Infrastructure\Storage\LocalPrivateStorage;
use App\Infrastructure\Storage\PrivateStorage;
use App\Support\Runtime\DisposableRuntimeGuard;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Filesystem\Factory as FilesystemFactory;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PrivateStorage::class, fn (Application $app): PrivateStorage => new LocalPrivateStorage(
            $app->make(FilesystemFactory::class)->disk('nscmf_private'),
        ));

        $this->app->singleton(MalwareScanner::class, fn (): MalwareScanner => new ClamdScanner(
            config()->string('nscmf.clamav.transport') === 'unix'
                ? 'unix://'.config()->string('nscmf.clamav.socket')
                : 'tcp://'.config()->string('nscmf.clamav.host').':'.config()->integer('nscmf.clamav.port'),
            config()->integer('nscmf.clamav.timeout_seconds'),
        ));
    }

    public function boot(): void
    {
        RateLimiter::for('nscmf-uploads', fn (Request $request): Limit => Limit::perMinute(config()->integer('security.upload_throttle.per_minute'))
            ->by('upload:'.self::throttleKey($request)));
        RateLimiter::for('nscmf-upload-finalize', fn (Request $request): Limit => Limit::perMinute(config()->integer('security.upload_throttle.finalize_per_minute'))
            ->by('finalize:'.self::throttleKey($request)));
        RateLimiter::for('pdf-validator', fn (Request $request): Limit => Limit::perMinute(config()->integer('security.pdf_validator_throttle.per_minute'))
            ->by('validator:'.$request->ip()));

        // Runs in every process, including the served browser runtime, not only inside Pest (G08).
        DisposableRuntimeGuard::assertBootIsSafe();

        // The locked "database" session driver, plus the authenticated_at anchor column (11 §50).
        Session::extend('database', function (Application $app): AnchoredDatabaseSessionHandler {
            $name = config('session.connection');
            $connection = $app->make('db')->connection(is_string($name) ? $name : null);

            return new AnchoredDatabaseSessionHandler(
                $connection,
                config()->string('session.table'),
                config()->integer('session.lifetime'),
                $app,
            );
        });
    }

    private static function throttleKey(Request $request): string
    {
        $id = $request->user()?->getAuthIdentifier();

        return is_int($id) || is_string($id) ? (string) $id : (string) $request->ip();
    }
}
