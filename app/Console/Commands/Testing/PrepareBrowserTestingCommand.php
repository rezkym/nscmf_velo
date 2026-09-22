<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use App\Domain\Shared\DomainRuleException;
use App\Services\Testing\BrowserFixtureService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Resets the disposable browser runtime (BE-005): guard first, then a fresh schema, reference
 * data and empty isolated storage. Never runs against a development database.
 */
final class PrepareBrowserTestingCommand extends Command
{
    protected $signature = 'nscmf:browser-testing:prepare';

    protected $description = 'Reset the guarded disposable database and storage used by Chromium journeys';

    public function handle(): int
    {
        try {
            BrowserFixtureService::assertBrowserRuntime();
        } catch (DomainRuleException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach (['filesystems.disks.nscmf_private.root', 'filesystems.disks.nscmf_runtime_tmp.root'] as $key) {
            File::deleteDirectory(config()->string($key));
            File::ensureDirectoryExists(config()->string($key));
        }

        $this->call('migrate:fresh', ['--force' => true]);
        $this->call('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);
        $this->info('Browser testing runtime prepared on '.config()->string('database.connections.mysql.database').'.');

        return self::SUCCESS;
    }
}
