<?php

declare(strict_types=1);

namespace App\Providers;

use App\Infrastructure\Session\AnchoredDatabaseSessionHandler;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
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
}
