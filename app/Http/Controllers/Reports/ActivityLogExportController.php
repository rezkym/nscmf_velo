<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\RequestActivityLogExportRequest;
use App\Models\User;
use App\Services\Reports\ActivityLogReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Activity Log export request, list, polling and download (12 §47.2). */
final class ActivityLogExportController extends Controller
{
    public function __construct(private readonly ActivityLogReportService $reports) {}

    public function store(RequestActivityLogExportRequest $request): JsonResponse
    {
        $export = $this->reports->request(
            self::actor($request),
            $request->exportFormat(),
            $request->selected() ? null : $request->filters(),
            $request->selected() ? $request->recordIds() : [],
            $request->siteLocation(),
            $request->person('prepared_by'),
            $request->person('acknowledged_by'),
        );

        return self::json(ActivityLogReportService::project($export), 202);
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->recent(self::actor($request))])->header('Cache-Control', 'no-store, private');
    }

    public function show(Request $request, int $export): JsonResponse
    {
        return self::json($this->reports->show(self::actor($request), $export));
    }

    public function download(Request $request, int $export): StreamedResponse
    {
        $file = $this->reports->download(self::actor($request), $export);
        $stream = $file['stream'];

        return response()->streamDownload(static function () use ($stream): void {
            try {
                fpassthru($stream);
            } finally {
                fclose($stream);
            }
        }, $file['filename'], [
            'Content-Type' => $file['mime'],
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
