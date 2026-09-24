<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Shared\DomainRuleException;
use App\Services\Security\SessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces the 8-hour absolute lifetime (10 §18). An authenticated session without an anchor
 * fails closed. Idle expiry (30 minutes) is the framework session lifetime itself.
 */
final class EnforceSessionLifetime
{
    public function __construct(private readonly SessionService $sessions) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('web')->check() && $this->sessions->isExpired($request->session())) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                throw new DomainRuleException('SESSION_EXPIRED', 'Your session has expired. Sign in again.', 401);
            }

            return redirect('/login');
        }

        $response = $next($request);
        assert($response instanceof Response);

        return $response;
    }
}
