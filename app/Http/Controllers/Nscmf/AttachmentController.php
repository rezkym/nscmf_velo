<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Attachment\AttachmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Final attachment metadata and logical removal (12 §59, §62). */
final class AttachmentController extends Controller
{
    public function __construct(private readonly AttachmentService $attachments) {}

    public function show(Request $request, int $record, int $attachment): JsonResponse
    {
        return self::json($this->attachments->show(self::actor($request), $record, $attachment));
    }

    public function destroy(Request $request, int $record, int $attachment): JsonResponse
    {
        $this->attachments->remove(self::actor($request), $record, $attachment);

        return self::json(['id' => $attachment, 'removed' => true]);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }

    /** @param array<mixed> $data */
    private static function json(array $data): JsonResponse
    {
        return response()->json(['data' => $data])->header('Cache-Control', 'no-store, private');
    }
}
