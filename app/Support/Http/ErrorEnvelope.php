<?php

declare(strict_types=1);

namespace App\Support\Http;

use App\Domain\Shared\DomainRuleException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Stable error transport (12 §9–12): JSON requests get {code, message, errors, context};
 * Inertia/web requests get domain errors flashed as domain_error (12 §10). Nothing here ever
 * echoes an exception message that was not written for the actor.
 */
final class ErrorEnvelope
{
    public static function render(Throwable $exception, Request $request): JsonResponse|RedirectResponse|null
    {
        if (! $request->expectsJson()) {
            return $exception instanceof DomainRuleException ? self::flashBack($exception) : null;
        }

        return match (true) {
            $exception instanceof DomainRuleException => self::json($exception->errorCode, $exception->getMessage(), $exception->status, $exception->errors, $exception->context),
            $exception instanceof ValidationException => self::json('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, self::fieldErrors($exception)),
            $exception instanceof AuthenticationException => self::json('AUTHENTICATION_REQUIRED', 'Sign in to continue.', 401),
            $exception instanceof HttpExceptionInterface => self::http($exception),
            default => config()->boolean('app.debug') ? null : self::json('SERVER_ERROR', 'Something went wrong. Try again later.', 500),
        };
    }

    /**
     * @param  array<string, mixed>  $errors
     * @param  array<string, mixed>  $context
     */
    public static function json(string $code, string $message, int $status, array $errors = [], array $context = []): JsonResponse
    {
        return new JsonResponse(
            ['code' => $code, 'message' => $message, 'errors' => (object) $errors, 'context' => (object) $context],
            $status,
            ['Cache-Control' => 'no-store, private'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function fieldErrors(ValidationException $exception): array
    {
        $errors = [];
        foreach ($exception->errors() as $field => $messages) {
            $errors[(string) $field] = $messages;
        }

        return $errors;
    }

    private static function http(HttpExceptionInterface $exception): JsonResponse
    {
        return match ($exception->getStatusCode()) {
            403 => self::json('FORBIDDEN', 'You are not allowed to do this.', 403),
            404 => self::json('RESOURCE_NOT_FOUND', 'The requested resource is not available.', 404),
            419 => self::json('SESSION_EXPIRED', 'Your session has expired. Reload the page and sign in again.', 419),
            429 => self::json('RATE_LIMITED', 'Too many requests. Try again later.', 429),
            default => self::json('SERVER_ERROR', 'Something went wrong. Try again later.', $exception->getStatusCode()),
        };
    }

    private static function flashBack(DomainRuleException $exception): RedirectResponse
    {
        Inertia::flash('domain_error', ['code' => $exception->errorCode, 'message' => $exception->getMessage()]);

        return back();
    }
}
