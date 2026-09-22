<?php

declare(strict_types=1);

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Administration\SetupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    public function __invoke(Request $request, SetupService $setup): Response|RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        if ($setup->mustRunSetup($user)) {
            return redirect('/administration/setup');
        }

        return Inertia::render('Dashboard/Index');
    }
}
