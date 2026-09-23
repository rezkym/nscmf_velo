<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\SaveChangeResultsRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfChangeResultService;
use App\Support\Http\JsonEnvelope;
use Illuminate\Http\JsonResponse;

/** PATCH /nscmf/{record}/change-results — structured JSON (12 §4.2, §29). */
final class SaveChangeResultsController extends Controller
{
    public function __invoke(SaveChangeResultsRequest $request, int $record, NscmfChangeResultService $results): JsonResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        $rows = [];

        foreach (is_array($request->validated('results')) ? $request->validated('results') : [] as $row) {
            if (is_array($row)) {
                $normalized = [];
                foreach ($row as $key => $value) {
                    $normalized[(string) $key] = $value;
                }
                $rows[] = $normalized;
            }
        }

        $data = $results->update($user, $record, $request->integer('record_version'), $rows);

        return JsonEnvelope::ok($data, ['warnings' => []]);
    }
}
