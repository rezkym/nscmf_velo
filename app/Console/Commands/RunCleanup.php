<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Maintenance\CleanupService;
use Illuminate\Console\Command;

/** Scheduler entry point for the housekeeping in CleanupService (14 §99). */
final class RunCleanup extends Command
{
    protected $signature = 'nscmf:cleanup {target : technical-logs|uploads|exports|runtime}';

    protected $description = 'Run one scheduled NSCMF housekeeping task';

    public function handle(CleanupService $cleanup): int
    {
        $count = match ($this->argument('target')) {
            'technical-logs' => $cleanup->technicalLogs(),
            'uploads' => $cleanup->uploads(),
            'exports' => $cleanup->exports(),
            'runtime' => $cleanup->runtimeWorkspaces(),
            default => null,
        };
        if ($count === null) {
            $this->error('Unknown cleanup target.');

            return self::FAILURE;
        }

        $this->info("Cleaned {$count} item(s).");

        return self::SUCCESS;
    }
}
