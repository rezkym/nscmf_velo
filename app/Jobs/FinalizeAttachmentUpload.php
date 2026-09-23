<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Attachment\AttachmentFinalizationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Assemble → hash → type check → whole-file scan → promote (12 §56). The finite timeout stays
 * below the database queue's retry_after so an active attempt is never duplicated.
 */
final class FinalizeAttachmentUpload implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 75;

    public function __construct(public readonly int $uploadSessionId) {}

    public function handle(AttachmentFinalizationService $finalization): void
    {
        $finalization->finalize($this->uploadSessionId);
    }

    public function failed(?Throwable $exception): void
    {
        app(AttachmentFinalizationService::class)->markFailed($this->uploadSessionId, 'UPLOAD_ASSEMBLY_FAILED');
    }
}
