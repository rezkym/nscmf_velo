<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\ListRecordsRequest;
use App\Models\User;
use App\Services\Nscmf\RecordEvidenceService;
use Illuminate\Http\JsonResponse;

final class RecordTimelineController extends Controller
{
    public function __invoke(ListRecordsRequest $request, int $record, RecordEvidenceService $evidence): JsonResponse
    {
        $actor = $request->user();
        assert($actor instanceof User);
        $query = $request->listQuery();

        return response()->json($evidence->timeline($actor, $record, $query['page'], $query['per_page']))
            ->header('Cache-Control', 'no-store, private');
    }
}
