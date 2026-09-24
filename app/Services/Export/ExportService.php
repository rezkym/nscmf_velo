<?php

declare(strict_types=1);

namespace App\Services\Export;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Pdf\PdfSigner;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Infrastructure\Storage\PrivateStorage;
use App\Infrastructure\Storage\RuntimeWorkspace;
use App\Jobs\GenerateExport;
use App\Models\Export\ExportBatch;
use App\Models\Export\ExportRequest;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Export\ExportRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\AccessAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use RuntimeException;
use ZipArchive;

/**
 * Export requests, polling, download and bulk batches (12 §64–71). A request binds an immutable
 * snapshot in one short transaction and queues the worker after commit.
 */
final readonly class ExportService
{
    public const string SNAPSHOT_SCHEMA = 'nscmf-export-snapshot/1';

    public function __construct(
        private NscmfRepository $records,
        private ExportRepository $exports,
        private TemplateRegistryService $templates,
        private SpreadsheetRenderer $renderer,
        private PdfSigner $signer,
        private PrivateStorage $storage,
        private AccessAuditService $accessAudit,
        private DatabaseManager $database,
        private RuntimeWorkspace $workspace,
    ) {}

    public function request(User $actor, int $recordId, ExportFormat $format, ?ExportBatch $batch = null): ExportRequest
    {
        $template = $this->templates->activeVerified();

        return $this->database->connection()->transaction(function () use ($actor, $recordId, $format, $batch, $template): ExportRequest {
            $record = $this->records->lockForUpdate($recordId);
            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
                throw DomainRuleException::notFound();
            }
            if (! $actor->can('nscmf.export')) {
                throw DomainRuleException::forbidden();
            }
            if ($format === ExportFormat::PDF) {
                $this->assertPdfReady($record);
            }

            $now = CarbonImmutable::now();
            $request = $this->exports->createRequest([
                'nscmf_record_id' => $record->id,
                'requested_by_user_id' => $actor->id,
                'export_batch_id' => $batch?->id,
                'format' => $format,
                'status' => ExportStatus::QUEUED,
                'requested_at' => $now,
            ]);
            $snapshot = $this->snapshot($record);
            $this->exports->createSnapshot([
                'export_request_id' => $request->id,
                'nscmf_record_id' => $record->id,
                'record_version' => $record->record_version,
                'workflow_iteration_id' => $record->current_workflow_iteration_id,
                'template_version_id' => $template->id,
                'snapshot_schema_version' => self::SNAPSHOT_SCHEMA,
                'snapshot_json' => $snapshot,
                'snapshot_sha256' => hash('sha256', self::canonicalJson($snapshot)),
                'created_at' => $now,
            ]);
            $this->accessAudit->record($actor->id, AccessAuditEvent::EXPORT_REQUESTED, $record->id, exportRequestId: $request->id);
            GenerateExport::dispatch($request->id)->afterCommit();

            return $request;
        });
    }

    /**
     * Each record is authorized independently; one refusal never blocks the others (12 §71).
     *
     * @param  list<int>  $recordIds
     * @return array<string, mixed>
     */
    public function bulk(User $actor, ExportFormat $format, array $recordIds): array
    {
        if (! $actor->can('nscmf.export.bulk')) {
            throw DomainRuleException::forbidden();
        }
        $batch = $this->exports->createBatch(['requested_by_user_id' => $actor->id, 'format' => $format]);

        $items = [];
        foreach (array_values(array_unique($recordIds)) as $recordId) {
            try {
                $items[] = ['record_id' => $recordId, ...self::project($this->request($actor, $recordId, $format, $batch))];
            } catch (DomainRuleException $refusal) {
                $items[] = ['record_id' => $recordId, 'error' => ['code' => $refusal->errorCode, 'message' => $refusal->getMessage()]];
            }
        }

        return ['id' => $batch->id, 'format' => $format->value, 'items' => $items];
    }

    /** @return array<string, mixed> */
    public function batch(User $actor, int $batchId): array
    {
        $batch = $this->exports->findBatch($batchId);
        if ($batch === null || $batch->requested_by_user_id !== $actor->id) {
            throw DomainRuleException::notFound();
        }

        return [
            'id' => $batch->id,
            'format' => $batch->format->value,
            'exports' => $batch->requests->map(fn (ExportRequest $request): array => self::project($request))->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function show(User $actor, int $exportId): array
    {
        return self::project($this->ownRequest($actor, $exportId));
    }

    /** @return array{stream: resource, filename: string, mime: string} */
    public function download(User $actor, int $exportId): array
    {
        $request = $this->ownRequest($actor, $exportId);
        $key = $this->downloadableKey($request);
        try {
            $stream = $this->storage->readStream($key);
        } catch (RuntimeException) {
            throw new DomainRuleException('EXPORT_EXPIRED', 'This export is no longer available. Request a new one.', 410);
        }
        $this->accessAudit->record($actor->id, AccessAuditEvent::EXPORT_DOWNLOADED, $request->nscmf_record_id, exportRequestId: $request->id);

        return ['stream' => $stream, 'filename' => self::fileName($request), 'mime' => (string) $request->artifact?->mime_type];
    }

    /**
     * One ZIP of a settled batch (G04): every READY, unexpired file the requester may still
     * download, byte for byte. Files that failed, expired or became invisible are left out;
     * each packaged file is audited as a download.
     *
     * @return array{stream: resource, filename: string}
     */
    public function package(User $actor, int $batchId): array
    {
        $batch = $this->exports->findBatch($batchId);
        if ($batch === null || $batch->requested_by_user_id !== $actor->id) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can('nscmf.export.bulk') || ! $actor->can('nscmf.export')) {
            throw DomainRuleException::forbidden();
        }
        if ($batch->requests->contains(fn (ExportRequest $request): bool => in_array($request->status, [ExportStatus::QUEUED, ExportStatus::PROCESSING], true))) {
            throw new DomainRuleException('EXPORT_NOT_READY', 'Some files in this batch are still being generated.', 409);
        }

        $files = [];
        foreach ($batch->requests as $request) {
            $record = $this->records->find($request->nscmf_record_id);
            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
                continue;
            }
            try {
                $files[] = [$request, $this->storage->localPath($this->downloadableKey($request))];
            } catch (DomainRuleException|RuntimeException) {
                continue;
            }
        }
        if ($files === []) {
            throw new DomainRuleException('EXPORT_EXPIRED', 'No file in this batch can be downloaded any more. Request a new export.', 410);
        }

        $directory = $this->workspace->create('exports');
        try {
            $path = $directory.'/batch.zip';
            $zip = new ZipArchive;
            if ($zip->open($path, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
                throw new RuntimeException('The export package could not be created.');
            }
            $names = [];
            foreach ($files as [$request, $file]) {
                $zip->addFile($file, self::uniqueName(self::fileName($request), $names));
            }
            if (! $zip->close()) {
                throw new RuntimeException('The export package could not be written.');
            }
            $stream = fopen($path, 'rb') ?: throw new RuntimeException('The export package could not be read.');
        } finally {
            // The open handle keeps the bytes readable after the directory is gone.
            $this->workspace->remove($directory);
        }
        foreach ($files as [$request]) {
            $this->accessAudit->record($actor->id, AccessAuditEvent::EXPORT_DOWNLOADED, $request->nscmf_record_id, exportRequestId: $request->id);
        }

        return ['stream' => $stream, 'filename' => "nscmf-exports-{$batch->id}.zip"];
    }

    /**
     * Canonical JSON: recursively key-sorted and without forced zero fractions, so the hash
     * survives MySQL's JSON normalization (which also stores 3.0 as 3).
     */
    public static function canonicalJson(mixed $value): string
    {
        $sort = static function (mixed $value) use (&$sort): mixed {
            if (! is_array($value)) {
                return $value;
            }
            if (! array_is_list($value)) {
                ksort($value);
            }

            return array_map($sort, $value);
        };

        return json_encode($sort($value), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** @return array<string, mixed> */
    public static function project(ExportRequest $request): array
    {
        return [
            'id' => $request->id,
            'record_id' => $request->nscmf_record_id,
            'format' => $request->format->value,
            'status' => $request->status->value,
            'requested_at' => $request->requested_at->toIso8601String(),
            'ready_at' => $request->ready_at?->toIso8601String(),
            'expires_at' => $request->expires_at?->toIso8601String(),
            'failure_code' => $request->failure_code,
            'signed' => $request->issuance !== null,
            // The immutable context the file is built from (FE-44 AC3); never the snapshot body.
            'snapshot' => $request->snapshot === null ? null : [
                'record_version' => $request->snapshot->record_version,
                'iteration_no' => $request->snapshot->recordField('iteration_no'),
                'template' => $request->snapshot->templateVersion->version_label,
            ],
            'download_url' => $request->status === ExportStatus::READY ? "/nscmf/exports/{$request->id}/download" : null,
        ];
    }

    /** PDF needs a qualified renderer; an Approved PDF also needs a ready Organization signer. */
    private function assertPdfReady(NscmfRecord $record): void
    {
        if (! $this->renderer->isAvailable()) {
            throw new DomainRuleException('EXPORT_NOT_READY', 'PDF export is not available yet.', 409);
        }
        if ($record->business_status === NscmfStatus::APPROVED && ! $this->signer->isReady()) {
            throw new DomainRuleException('SIGNING_NOT_READY', 'Approved PDFs cannot be signed right now.', 409);
        }
    }

    /** The private key of a READY, unexpired artifact; otherwise the matching refusal. */
    private function downloadableKey(ExportRequest $request): string
    {
        $artifact = $request->artifact;
        if ($request->status === ExportStatus::EXPIRED || ($artifact !== null && ($artifact->expires_at->isPast() || $artifact->binary_purged_at !== null))) {
            throw new DomainRuleException('EXPORT_EXPIRED', 'This export expired. Request a new one.', 410);
        }
        if ($request->status === ExportStatus::FAILED) {
            throw new DomainRuleException('EXPORT_FAILED', 'This export failed. Request a new one.', 409);
        }
        if ($request->status !== ExportStatus::READY || $artifact?->private_object_key === null) {
            throw new DomainRuleException('EXPORT_NOT_READY', 'This export is not ready yet.', 409);
        }

        return $artifact->private_object_key;
    }

    private static function fileName(ExportRequest $request): string
    {
        $requestNo = $request->snapshot?->recordField('request_no');

        return preg_replace('/[^A-Za-z0-9._-]+/', '-', is_string($requestNo) ? $requestNo : 'nscmf').'.'.strtolower($request->format->value);
    }

    /** @param array<string, true> $taken */
    private static function uniqueName(string $name, array &$taken): string
    {
        $candidate = $name;
        for ($n = 2; isset($taken[$candidate]); $n++) {
            $candidate = pathinfo($name, PATHINFO_FILENAME)."-{$n}.".pathinfo($name, PATHINFO_EXTENSION);
        }
        $taken[$candidate] = true;

        return $candidate;
    }

    private function ownRequest(User $actor, int $exportId): ExportRequest
    {
        $request = $this->exports->findRequest($exportId);
        $record = $request === null ? null : $this->records->find($request->nscmf_record_id);
        if ($request === null || $record === null || $request->requested_by_user_id !== $actor->id || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can('nscmf.export')) {
            throw DomainRuleException::forbidden();
        }

        return $request;
    }

    /**
     * The export input bound at request time: header, form and current sign-offs (11 §44).
     *
     * @return array<string, mixed>
     */
    private function snapshot(NscmfRecord $record): array
    {
        $record->load(['requestedBy', 'currentIteration.reviewedBy', 'currentIteration.approvedBy']);
        $iteration = $record->currentIteration;
        $signoff = static fn (?User $user, ?CarbonImmutable $at): ?array => $user === null ? null : [
            'name' => $user->name,
            'date' => $at?->setTimezone('Asia/Jakarta')->toDateString(),
        ];

        return [
            'record' => [
                'id' => $record->id,
                'request_no' => $record->request_no,
                'family' => $record->family->value,
                'subtype' => $record->subtype->value,
                'request_date' => $record->request_date?->toDateString(),
                'business_status' => $record->business_status->value,
                'record_version' => $record->record_version,
                'iteration_no' => $iteration?->iteration_no,
            ],
            'signoffs' => [
                'requested_by' => $signoff($record->requestedBy, $record->first_submitted_at),
                'reviewed_by' => $signoff($iteration?->reviewedBy, $iteration?->reviewed_at),
                'approved_by' => $signoff($iteration?->approvedBy, $iteration?->approved_at),
            ],
            'form' => $this->records->familyState($record),
        ];
    }
}
