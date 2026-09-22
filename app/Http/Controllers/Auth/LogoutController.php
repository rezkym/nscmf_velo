<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\LoginService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class LogoutController extends Controller
{
    public function __invoke(Request $request, LoginService $login): RedirectResponse
    {
        $user = $request->user();

        $login->logout($user instanceof User ? $user : null, Auth::guard('web'), $request->session(), $request->ip());

        return redirect('/login');
    }
}
