<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * One application, two ingress contexts (20 §19–21, BE-123): on the configured public hostname
 * only the validator and its static assets exist; everything else is a plain 404.
 */
final class RestrictPublicIngress
{
    private const array PUBLIC_PATHS = ['ispdfvalid', 'ispdfvalid/verify', 'favicon.ico', 'robots.txt', 'build/*'];

    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $publicHost = config()->string('nscmf.public_host');
        if ($publicHost !== '' && strcasecmp($request->getHost(), $publicHost) === 0 && ! $request->is(...self::PUBLIC_PATHS)) {
            abort(404);
        }

        return $next($request);
    }
}
