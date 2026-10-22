<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use App\Domain\Reports\ActivityLogMappingV1;
use App\Domain\Reports\ActivityLogSnapshot;
use App\Infrastructure\Pdf\RenderFailed;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Infrastructure\Storage\PrivateStorage;
use App\Infrastructure\Storage\RuntimeWorkspace;
use App\Infrastructure\Workbook\ActivityLogWorkbookPatcher;
use App\Infrastructure\Workbook\WorkbookPatchFailed;
use App\Models\Reports\ActivityLogExport;
use App\Repositories\Contracts\Reports\ActivityLogRepository;
use App\Services\Export\ExportService;
use App\Services\Export\TemplateRegistryService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use InvalidArgumentException;
use LogicException;
use RuntimeException;

/**
 * The Activity Log export worker (09 §63A): snapshot → log workbook → (PDF: renderer, no signing)
 * → private artifact → READY. It reads only the bound snapshot and reports its progress between
 * steps in short transactions, never holding a lock during file work.
 */
final readonly class ActivityLogExportGenerationService
{
    private const int PREPARING = 5;

    private const int FILLING = 10;

    private const int FILLED = 70;

    private const int RENDERED = 90;

    public function __construct(
        private ActivityLogRepository $exports,
        private TemplateRegistryService $templates,
        private ActivityLogWorkbookPatcher $patcher,
        private SpreadsheetRenderer $renderer,
        private PrivateStorage $storage,
        private RuntimeWorkspace $workspace,
        private DatabaseManager $database,
    ) {}

    public function generate(int $exportId): void
    {
        $claimed = $this->database->connection()->transaction(function () use ($exportId): bool {
            $export = $this->exports->lockExport($exportId);
            // PROCESSING here means an earlier attempt of this same job was cut off before it settled.
            if (! in_array($export->status, [ExportStatus::QUEUED, ExportStatus::PROCESSING], true)) {
                return false;
            }
            $this->exports->updateExport($export, ['status' => ExportStatus::PROCESSING, 'started_at' => CarbonImmutable::now(), 'progress_percent' => self::PREPARING]);

            return true;
        });
        if (! $claimed) {
            return;
        }

        $export = $this->exports->findExport($exportId) ?? throw new LogicException('Claimed export vanished.');
        if (hash('sha256', ExportService::canonicalJson($export->snapshot_json)) !== $export->snapshot_sha256) {
            $this->fail($exportId, 'REPORT_SNAPSHOT_INTEGRITY', 'The report snapshot failed its integrity check.');

            return;
        }
        try {
            $snapshot = ActivityLogSnapshot::fromStored($export->snapshot_json);
        } catch (InvalidArgumentException) {
            $this->fail($exportId, 'REPORT_SNAPSHOT_INTEGRITY', 'The report snapshot is not readable.');

            return;
        }

        $directory = $this->workspace->create('exports');
        try {
            $this->progress($exportId, self::FILLING);
            $xlsx = $directory.'/nscmf-activity-log.xlsx';
            $this->patcher->patch($this->templates->verifiedPath($export->templateVersion), $xlsx, ActivityLogMappingV1::fill($snapshot));
            $this->progress($exportId, self::FILLED);
            $output = $xlsx;
            if ($export->format === ExportFormat::PDF) {
                $output = $this->renderer->render($xlsx, $directory);
                $this->progress($exportId, self::RENDERED);
            }
            $this->store($export, $output);
        } catch (WorkbookPatchFailed) {
            $this->fail($exportId, 'REPORT_TEMPLATE_PATCH_FAILED', 'The log workbook could not be filled.');
        } catch (RenderFailed) {
            $this->fail($exportId, 'REPORT_RENDER_FAILED', 'The PDF could not be rendered.');
        } finally {
            $this->workspace->remove($directory);
        }
    }

    public function fail(int $exportId, string $code, string $summary): void
    {
        $this->database->connection()->transaction(function () use ($exportId, $code, $summary): void {
            $export = $this->exports->lockExport($exportId);
            if (in_array($export->status, [ExportStatus::QUEUED, ExportStatus::PROCESSING], true)) {
                $this->exports->updateExport($export, [
                    'status' => ExportStatus::FAILED, 'failed_at' => CarbonImmutable::now(),
                    'failure_code' => $code, 'failure_summary' => $summary,
                ]);
            }
        });
    }

    private function progress(int $exportId, int $percent): void
    {
        $this->database->connection()->transaction(function () use ($exportId, $percent): void {
            $export = $this->exports->lockExport($exportId);
            if ($export->status === ExportStatus::PROCESSING && $export->progress_percent < $percent) {
                $this->exports->updateExport($export, ['progress_percent' => $percent]);
            }
        });
    }

    private function store(ActivityLogExport $export, string $path): void
    {
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new RuntimeException('The generated report is unreadable.');
        }
        try {
            $key = $this->storage->write(PrivateStorage::EXPORTS, $stream);
        } finally {
            fclose($stream);
        }
        $sha256 = (string) hash_file('sha256', $path);
        $size = (int) filesize($path);

        $this->database->connection()->transaction(function () use ($export, $key, $sha256, $size): void {
            $locked = $this->exports->lockExport($export->id);
            $now = CarbonImmutable::now();
            $this->exports->updateExport($locked, [
                'status' => ExportStatus::READY,
                'progress_percent' => 100,
                'ready_at' => $now,
                'expires_at' => $now->addHours(config()->integer('nscmf.exports.retention_hours')),
                'private_object_key' => $key,
                'mime_type' => $locked->format->mimeType(),
                'size_bytes' => $size,
                'artifact_sha256' => $sha256,
            ]);
        });
    }
}
