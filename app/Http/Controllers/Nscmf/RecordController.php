<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Attachment\AttachmentService;
use App\Services\Nscmf\NscmfQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RecordController extends Controller
{
    public function __construct(
        private readonly NscmfQueryService $queries,
        private readonly AttachmentService $attachments,
    ) {}

    public function show(Request $request, int $record): Response
    {
        $actor = self::actor($request);

        return Inertia::render('Nscmf/Show', [
            'record' => $this->queries->detail($actor, $record),
            'attachments' => $this->attachments->list($actor, $record),
        ]);
    }

    public function edit(Request $request, int $record): Response
    {
        $actor = self::actor($request);
        $page = $this->queries->editPage($actor, $record);

        return Inertia::render($page['component'], [
            ...$page['props'],
            'attachments' => $this->attachments->list($actor, $record),
            'attachment_policy' => AttachmentService::policy(),
        ]);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
