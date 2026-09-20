<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        $this->ensureDisposableTestDatabase($app);

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * Tests may reset their database, so refuse to run against anything other than
     * the isolated disposable test database (16_Testing_Specification.md §35).
     */
    private function ensureDisposableTestDatabase(Application $app): void
    {
        $connection = $app->make('config')->string('database.default');
        $database = $app->make('config')->get("database.connections.{$connection}.database");

        if (! $app->environment('testing') || ! is_string($database) || ! str_ends_with($database, '_testing')) {
            throw new RuntimeException(
                'Refusing to run tests: the database must be a disposable "*_testing" database in the testing environment.',
            );
        }
    }
}
