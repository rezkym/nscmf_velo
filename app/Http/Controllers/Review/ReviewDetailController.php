<?php

declare(strict_types=1);

namespace App\Http\Controllers\Review;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use App\Services\Nscmf\RecordEvidenceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class ReviewDetailController extends Controller
{
    public function __invoke(Request $request, int $record, NscmfQueryService $queries, RecordEvidenceService $evidence): Response
    {
        $user = $request->user();
        assert($user instanceof User);
        $detail = $queries->reviewDetail($user, $record);

        return Inertia::render('Review/Show', [
            'record' => $detail,
            'attachments' => $evidence->attachments($user, $record),
        ]);
    }
}
