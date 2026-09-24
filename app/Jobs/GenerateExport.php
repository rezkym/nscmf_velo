<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Export\ExportGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Builds one export from its bound snapshot (BE-109). Timeout stays below retry_after. */
final class GenerateExport implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 80;

    public function __construct(public readonly int $exportRequestId) {}

    public function handle(ExportGenerationService $generation): void
    {
        $generation->generate($this->exportRequestId);
    }

    public function failed(?Throwable $exception): void
    {
        app(ExportGenerationService::class)->fail($this->exportRequestId, 'EXPORT_FAILED', 'The export could not be generated.');
    }
}
