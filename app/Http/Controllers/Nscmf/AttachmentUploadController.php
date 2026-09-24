<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\InitiateUploadRequest;
use App\Models\User;
use App\Services\Attachment\AttachmentUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Resumable upload transport endpoints (12 §52–56, §60). JSON only. */
final class AttachmentUploadController extends Controller
{
    public function __construct(private readonly AttachmentUploadService $uploads) {}

    public function store(InitiateUploadRequest $request, int $record): JsonResponse
    {
        $state = $this->uploads->initiate(
            self::actor($request),
            $record,
            $request->string('filename')->toString(),
            $request->integer('size_bytes'),
            $request->filled('mime_type') ? $request->string('mime_type')->toString() : null,
            $request->filled('fingerprint_sha256') ? $request->string('fingerprint_sha256')->toString() : null,
        );

        return self::json($state, $state['resumed'] === true ? 200 : 201);
    }

    public function show(Request $request, int $record, string $upload): JsonResponse
    {
        return self::json($this->uploads->status(self::actor($request), $record, $upload));
    }

    public function chunk(Request $request, int $record, string $upload, int $chunk): JsonResponse
    {
        $body = $request->getContent(true);

        return self::json($this->uploads->acceptChunk(self::actor($request), $record, $upload, $chunk, $body));
    }

    public function complete(Request $request, int $record, string $upload): JsonResponse
    {
        return self::json($this->uploads->complete(self::actor($request), $record, $upload), 202);
    }

    public function destroy(Request $request, int $record, string $upload): JsonResponse
    {
        return self::json($this->uploads->cancel(self::actor($request), $record, $upload));
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
