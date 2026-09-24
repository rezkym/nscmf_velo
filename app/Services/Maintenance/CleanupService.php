<?php

declare(strict_types=1);

namespace App\Services\Maintenance;

use App\Domain\Attachment\SecurityStatus;
use App\Domain\Attachment\UploadStatus;
use App\Domain\Export\ExportStatus;
use App\Infrastructure\Storage\PrivateStorage;
use App\Infrastructure\Storage\RuntimeWorkspace;
use App\Models\Attachment\UploadSession;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use App\Repositories\Contracts\Export\ExportRepository;
use App\Repositories\Contracts\Settings\SystemSettingsRepository;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Database\DatabaseManager;

/**
 * Scheduled housekeeping (14 §96–100, 11A §22). Each cleanup touches only technical artefacts —
 * never NSCMF business state, workflow, issuance or the authoritative audit tables — and is
 * safe to repeat.
 */
final readonly class CleanupService
{
    private const int BATCH = 200;

    public function __construct(
        private SystemSettingsRepository $settings,
        private AttachmentRepository $attachments,
        private ExportRepository $exports,
        private PrivateStorage $storage,
        private RuntimeWorkspace $workspace,
        private Factory $filesystems,
        private DatabaseManager $database,
    ) {}

    /** Technical Logs only, per the current typed setting, calendar units in Asia/Jakarta (14 §27, §96). */
    public function technicalLogs(): int
    {
        $setting = $this->settings->current();
        if (! $setting->technical_log_auto_cleanup_enabled) {
            return 0;
        }
        $now = CarbonImmutable::now('Asia/Jakarta');
        $cutoff = $setting->technical_log_retention_unit === 'MONTH'
            ? $now->subMonthsNoOverflow($setting->technical_log_retention_value)
            : $now->subDays($setting->technical_log_retention_value);

        $logs = $this->filesystems->disk('nscmf_logs');
        $deleted = 0;
        foreach ($logs->allFiles() as $file) {
            if (str_ends_with($file, '.log') && $logs->lastModified($file) < $cutoff->getTimestamp()) {
                $logs->delete($file);
                $deleted++;
            }
        }

        return $deleted;
    }

    /** Unfinished uploads past 24h inactivity, and quarantined files whose scan never finished (BE-128). */
    public function uploads(): int
    {
        $now = CarbonImmutable::now();
        $cleaned = 0;
        foreach ($this->attachments->expiredSessions($now, self::BATCH) as $session) {
            // Re-check under lock: a chunk accepted meanwhile moved the expiry forward.
            $expired = $this->database->connection()->transaction(function () use ($session, $now): bool {
                $locked = $this->attachments->lockSession($session->id);
                if ($locked->upload_status !== UploadStatus::UPLOADING || $locked->expires_at->greaterThan($now)) {
                    return false;
                }
                $this->attachments->updateSession($locked, ['upload_status' => UploadStatus::EXPIRED]);

                return true;
            });
            if ($expired) {
                $this->discardChunks($session);
                $cleaned++;
            }
        }

        $abandonedBefore = $now->subHours(config()->integer('nscmf.attachments.inactivity_hours'));
        foreach ($this->attachments->abandonedPending($abandonedBefore, self::BATCH) as $attachment) {
            if ($attachment->quarantine_object_key !== null) {
                $this->storage->delete($attachment->quarantine_object_key);
            }
            $this->attachments->updateAttachment($attachment, ['security_status' => SecurityStatus::FAILED, 'quarantine_object_key' => null]);
            $cleaned++;
        }

        foreach ($this->attachments->abandonedAssembling($abandonedBefore, self::BATCH) as $session) {
            $this->attachments->updateSession($session, ['upload_status' => UploadStatus::FAILED, 'failure_code' => 'UPLOAD_ASSEMBLY_FAILED']);
            $this->discardChunks($session);
            $cleaned++;
        }

        return $cleaned;
    }

    /** READY binaries after exactly 168h: bytes go, request/snapshot/issuance/history stay (BE-129). */
    public function exports(): int
    {
        $now = CarbonImmutable::now();
        $purged = 0;
        foreach ($this->exports->expiredArtifacts($now, self::BATCH) as $artifact) {
            if ($artifact->private_object_key !== null) {
                $this->storage->delete($artifact->private_object_key);
            }
            $this->database->connection()->transaction(function () use ($artifact, $now): void {
                $this->exports->updateArtifact($artifact, ['binary_purged_at' => $now]);
                $request = $this->exports->lockRequest($artifact->export_request_id);
                if ($request->status === ExportStatus::READY) {
                    $this->exports->updateRequest($request, ['status' => ExportStatus::EXPIRED]);
                }
            });
            $purged++;
        }

        return $purged;
    }

    /**
     * Scratch directories a crashed job left behind (BE-130, G18). A directory older than the
     * queue's retry window cannot belong to a live attempt, so no new retention value is invented.
     */
    public function runtimeWorkspaces(): int
    {
        $olderThan = config()->integer('queue.connections.database.retry_after');
        $removed = 0;
        foreach (['exports', 'validator'] as $purpose) {
            foreach ($this->workspace->staleDirectories($purpose, $olderThan) as $directory) {
                $this->workspace->deleteRelative($directory);
                $removed++;
            }
        }

        return $removed;
    }

    private function discardChunks(UploadSession $session): void
    {
        foreach ($session->chunks as $chunk) {
            $this->storage->delete($chunk->storage_key);
        }
    }
}
