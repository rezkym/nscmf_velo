<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\RequestExportRequest;
use App\Models\User;
use App\Services\Export\ExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Export request, polling, download and bulk batches (12 §65–71). */
final class ExportController extends Controller
{
    public function __construct(private readonly ExportService $exports) {}

    public function store(RequestExportRequest $request, int $record): JsonResponse
    {
        return self::json(ExportService::project($this->exports->request(self::actor($request), $record, $request->exportFormat())), 202);
    }

    public function bulk(RequestExportRequest $request): JsonResponse
    {
        return self::json($this->exports->bulk(self::actor($request), $request->exportFormat(), $request->recordIds()), 202);
    }

    public function show(Request $request, int $export): JsonResponse
    {
        return self::json($this->exports->show(self::actor($request), $export));
    }

    public function batch(Request $request, int $batch): JsonResponse
    {
        return self::json($this->exports->batch(self::actor($request), $batch));
    }

    public function download(Request $request, int $export): StreamedResponse
    {
        $file = $this->exports->download(self::actor($request), $export);

        return self::stream($file['stream'], $file['filename'], $file['mime']);
    }

    public function package(Request $request, int $batch): StreamedResponse
    {
        $file = $this->exports->package(self::actor($request), $batch);

        return self::stream($file['stream'], $file['filename'], 'application/zip');
    }

    /** @param resource $stream */
    private static function stream(mixed $stream, string $filename, string $mime): StreamedResponse
    {
        return response()->streamDownload(static function () use ($stream): void {
            try {
                fpassthru($stream);
            } finally {
                fclose($stream);
            }
        }, $filename, [
            'Content-Type' => $mime,
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }

    /** @param array<string, mixed> $data */
    private static function json(array $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status)->header('Cache-Control', 'no-store, private');
    }
}
