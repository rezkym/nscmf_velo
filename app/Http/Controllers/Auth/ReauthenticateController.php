<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ReauthenticateRequest;
use App\Models\User;
use App\Services\Security\CredentialService;
use Illuminate\Http\Response;

/** Same-origin JSON: 204 on success, 403 REAUTH_FAILED otherwise (12 §79, §109). */
final class ReauthenticateController extends Controller
{
    public function __invoke(ReauthenticateRequest $request, CredentialService $credentials): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        $credentials->reauthenticate($user, $request->string('current_password')->toString(), $request->session(), $request->ip());

        return response()->noContent()->header('Cache-Control', 'no-store, private');
    }
}
