<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangeTemporaryPasswordRequest;
use App\Models\User;
use App\Services\Security\CredentialService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class TemporaryPasswordController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->must_change_password) {
            return redirect('/dashboard');
        }

        return Inertia::render('Auth/ChangeTemporaryPassword');
    }

    public function update(ChangeTemporaryPasswordRequest $request, CredentialService $credentials): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        $credentials->replaceTemporaryPassword($user, $request->string('password')->toString(), $request->session(), $request->ip());

        return redirect('/dashboard');
    }
}
