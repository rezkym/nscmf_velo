<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Export\PdfValidatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

/** GET /ispdfvalid and POST /ispdfvalid/verify — the only public capability (12 §72–75). */
final class PublicValidatorController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Public/PdfValidator', ['max_bytes' => config()->integer('nscmf.attachments.max_bytes')]);
    }

    public function verify(Request $request, PdfValidatorService $validator): JsonResponse
    {
        $request->validate(['file' => ['required', 'file']]);
        $file = $request->file('file');
        assert($file instanceof UploadedFile);

        return response()->json(['data' => $validator->verify($file)])->header('Cache-Control', 'no-store, private');
    }
}
