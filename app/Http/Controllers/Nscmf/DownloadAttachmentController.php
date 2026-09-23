<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Nscmf\RecordEvidenceService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DownloadAttachmentController extends Controller
{
    public function __invoke(Request $request, int $record, int $attachment, RecordEvidenceService $evidence): StreamedResponse
    {
        $actor = $request->user();
        assert($actor instanceof User);
        $file = $evidence->download($actor, $record, $attachment);

        return response()->streamDownload(static function () use ($file): void {
            try {
                fpassthru($file['stream']);
            } finally {
                fclose($file['stream']);
            }
        }, $file['filename'], [
            'Content-Type' => 'application/octet-stream',
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
