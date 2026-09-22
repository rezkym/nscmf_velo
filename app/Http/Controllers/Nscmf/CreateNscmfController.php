<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Domain\Shared\DomainRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\CreateNscmfRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfCreationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class CreateNscmfController extends Controller
{
    public function create(Request $request): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->can('nscmf.create')) {
            throw DomainRuleException::forbidden();
        }

        return Inertia::render('Nscmf/Create');
    }

    public function store(CreateNscmfRequest $request, NscmfCreationService $creation): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        $recordId = $creation->create(
            $user,
            NscmfFamily::from($request->string('family')->toString()),
            NscmfSubtype::from($request->string('subtype')->toString()),
            NumberingMode::from($request->string('numbering_mode')->toString()),
            $request->filled('request_no') ? $request->string('request_no')->toString() : null,
        );

        return redirect("/nscmf/{$recordId}/edit", 303);
    }
}
