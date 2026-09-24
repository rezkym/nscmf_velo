<?php

declare(strict_types=1);

namespace App\Services\Export;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use App\Domain\Export\NscmfFormMappingV1;
use App\Infrastructure\Pdf\PdfSigner;
use App\Infrastructure\Pdf\RenderFailed;
use App\Infrastructure\Pdf\SigningFailed;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Infrastructure\Storage\PrivateStorage;
use App\Infrastructure\Storage\RuntimeWorkspace;
use App\Infrastructure\Workbook\WorkbookPatcher;
use App\Infrastructure\Workbook\WorkbookPatchFailed;
use App\Models\Export\ExportRequest;
use App\Models\Export\ExportSnapshot;
use App\Repositories\Contracts\Export\ExportRepository;
use App\Repositories\Contracts\Export\SigningCertificateRepository;
use App\Services\Audit\SecurityAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;

/**
 * The export worker's use case (BE-109, BE-115, BE-117, BE-119): snapshot → OOXML patch →
 * (PDF: qualified renderer → Organization signature for Approved) → private artifact → READY.
 * It reads only the bound snapshot, never the live record, and never runs I/O under a lock.
 */
final readonly class ExportGenerationService
{
    public function __construct(
        private ExportRepository $exports,
        private SigningCertificateRepository $certificates,
        private TemplateRegistryService $templates,
        private WorkbookPatcher $patcher,
        private SpreadsheetRenderer $renderer,
        private PdfSigner $signer,
        private PrivateStorage $storage,
        private RuntimeWorkspace $workspace,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    public function generate(int $exportId): void
    {
        $claimed = $this->database->connection()->transaction(function () use ($exportId): bool {
            $request = $this->exports->lockRequest($exportId);
            // PROCESSING here means an earlier attempt of this same job was cut off before it
            // settled; the queue never runs two attempts at once (job timeout < retry_after).
            if (! in_array($request->status, [ExportStatus::QUEUED, ExportStatus::PROCESSING], true)) {
                return false;
            }
            $this->exports->updateRequest($request, ['status' => ExportStatus::PROCESSING, 'started_at' => CarbonImmutable::now()]);

            return true;
        });
        if (! $claimed) {
            return;
        }

        $request = $this->exports->findRequest($exportId) ?? throw new \LogicException('Claimed export vanished.');
        $snapshot = $request->snapshot ?? throw new \LogicException('Export has no bound snapshot.');
        if (hash('sha256', ExportService::canonicalJson($snapshot->snapshot_json)) !== $snapshot->snapshot_sha256) {
            $this->fail($exportId, 'EXPORT_SNAPSHOT_INTEGRITY', 'The export snapshot failed its integrity check.');

            return;
        }

        $directory = $this->workspace->create('exports');
        try {
            $xlsx = $directory.'/nscmf.xlsx';
            $fill = NscmfFormMappingV1::fill($snapshot->snapshot_json);
            $this->patcher->patch($this->templates->verifiedPath($snapshot->templateVersion), $xlsx, $fill);
            $output = $request->format === ExportFormat::PDF ? $this->pdf($request, $snapshot, $xlsx, $directory, $fill['skip_pages']) : $xlsx;
            if ($output !== null) {
                $this->store($request, $snapshot, $output);
            }
        } catch (WorkbookPatchFailed) {
            $this->fail($exportId, 'EXPORT_TEMPLATE_PATCH_FAILED', 'The official workbook could not be filled.');
        } catch (RenderFailed) {
            $this->fail($exportId, 'EXPORT_RENDER_FAILED', 'The PDF could not be rendered.');
        } finally {
            $this->workspace->remove($directory);
        }
    }

    public function fail(int $exportId, string $code, string $summary): void
    {
        $this->database->connection()->transaction(function () use ($exportId, $code, $summary): void {
            $request = $this->exports->lockRequest($exportId);
            if (in_array($request->status, [ExportStatus::QUEUED, ExportStatus::PROCESSING], true)) {
                $this->exports->updateRequest($request, [
                    'status' => ExportStatus::FAILED, 'failed_at' => CarbonImmutable::now(),
                    'failure_code' => $code, 'failure_summary' => $summary,
                ]);
            }
        });
    }

    /**
     * Returns the PDF to store, or null when signing failed and the export was failed.
     *
     * @param  array{int, int}  $skipPages
     */
    private function pdf(ExportRequest $request, ExportSnapshot $snapshot, string $xlsx, string $directory, array $skipPages): ?string
    {
        $pdf = $this->renderer->render($xlsx, $directory, $skipPages);
        if ($snapshot->recordField('business_status') !== 'APPROVED') {
            return $pdf;
        }

        // Approved: sign or fail. The record stays APPROVED; no unsigned artifact exists (12 §68).
        $signed = $directory.'/nscmf-signed.pdf';
        try {
            $this->signer->sign($pdf, $signed);
        } catch (SigningFailed) {
            $this->fail($request->id, 'SIGNING_FAILED', 'The Approved PDF could not be signed.');
            $this->securityAudit->record(
                event: SecurityAuditEvent::PDF_SIGNING_FAILED,
                outcome: SecurityAuditOutcome::ERROR,
                recordId: $request->nscmf_record_id,
                exportRequestId: $request->id,
            );

            return null;
        }

        return $signed;
    }

    private function store(ExportRequest $request, ExportSnapshot $snapshot, string $path): void
    {
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new \RuntimeException('The generated export is unreadable.');
        }
        try {
            $key = $this->storage->write(PrivateStorage::EXPORTS, $stream);
        } finally {
            fclose($stream);
        }
        $sha256 = (string) hash_file('sha256', $path);
        $signed = $request->format === ExportFormat::PDF && $snapshot->recordField('business_status') === 'APPROVED';

        $this->database->connection()->transaction(function () use ($request, $snapshot, $path, $key, $sha256, $signed): void {
            $locked = $this->exports->lockRequest($request->id);
            $now = CarbonImmutable::now();
            $expiresAt = $now->addHours(config()->integer('nscmf.exports.retention_hours'));
            $artifact = $this->exports->createArtifact([
                'export_request_id' => $locked->id,
                'private_object_key' => $key,
                'mime_type' => $locked->format->mimeType(),
                'size_bytes' => (int) filesize($path),
                'artifact_sha256' => $sha256,
                'created_at' => $now,
                'expires_at' => $expiresAt,
            ]);
            if ($signed) {
                $certificate = $this->certificates->activeByFingerprint($this->signer->certificateFingerprint())
                    ?? throw new \LogicException('The signing certificate is not registered.');
                $this->exports->createIssuance([
                    'export_request_id' => $locked->id,
                    'export_artifact_id' => $artifact->id,
                    'nscmf_record_id' => $locked->nscmf_record_id,
                    'export_snapshot_id' => $snapshot->id,
                    'workflow_iteration_id' => $snapshot->workflow_iteration_id,
                    'signing_certificate_id' => $certificate,
                    'final_pdf_sha256' => $sha256,
                    'issued_at' => $now,
                ]);
            }
            $this->exports->updateRequest($locked, ['status' => ExportStatus::READY, 'ready_at' => $now, 'expires_at' => $expiresAt]);
        });
    }
}
