<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\SaveDraftRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfDraftService;
use App\Support\Http\JsonEnvelope;
use Illuminate\Http\JsonResponse;

/** PATCH /nscmf/{record}/draft — structured JSON (12 §4.2, §26). */
final class SaveDraftController extends Controller
{
    public function __invoke(SaveDraftRequest $request, int $record, NscmfDraftService $drafts): JsonResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        $result = $drafts->save($user, $record, $request->validated());

        return JsonEnvelope::ok($result['data'], ['warnings' => $result['warnings']]);
    }
}
