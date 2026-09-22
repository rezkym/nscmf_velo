<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps an account with a temporary password away from every page and action except the
 * change page, its POST and logout (10 §11, 12 §78).
 */
final class EnsurePasswordChanged
{
    private const array ALLOWED_ROUTES = ['account.temporary-password', 'account.temporary-password.change', 'logout'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->must_change_password && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            if ($request->expectsJson()) {
                throw new DomainRuleException('PASSWORD_CHANGE_REQUIRED', 'Change your temporary password to continue.', 403);
            }

            return redirect('/account/temporary-password');
        }

        $response = $next($request);
        assert($response instanceof Response);

        return $response;
    }
}
