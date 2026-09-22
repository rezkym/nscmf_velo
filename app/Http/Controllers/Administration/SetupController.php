<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Administration\SetupService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class SetupController extends Controller
{
    public function __invoke(Request $request, SetupService $setup): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('Administration/Setup', $setup->page($user));
    }
}
