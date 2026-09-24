<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Security\LoginService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

final class LoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function store(LoginRequest $request, LoginService $login): RedirectResponse
    {
        $login->login(
            $request->string('username')->toString(),
            $request->string('password')->toString(),
            $request->ip(),
            Auth::guard('web'),
            $request->session(),
        );

        return redirect('/dashboard');
    }
}
