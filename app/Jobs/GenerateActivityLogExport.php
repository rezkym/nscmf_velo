<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Reports\ActivityLogExportGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Builds one Activity Log file from its bound snapshot (09 §63A). Timeout stays below retry_after. */
final class GenerateActivityLogExport implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 80;

    public function __construct(public readonly int $activityLogExportId) {}

    public function handle(ActivityLogExportGenerationService $generation): void
    {
        $generation->generate($this->activityLogExportId);
    }

    public function failed(?Throwable $exception): void
    {
        app(ActivityLogExportGenerationService::class)->fail($this->activityLogExportId, 'REPORT_FAILED', 'The report could not be generated.');
    }
}
