<?php

declare(strict_types=1);

namespace App\Domain\Shared;

use RuntimeException;

/**
 * A safe, stable domain/action failure (12 §9–12). The message and context are shown to the
 * actor, so they never carry SQL, paths, secrets or data the actor may not know.
 */
final class DomainRuleException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $context
     * @param  array<string, list<string>>  $errors
     */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status,
        public readonly array $context = [],
        public readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    public static function forbidden(string $message = 'You are not allowed to do this.'): self
    {
        return new self('FORBIDDEN', $message, 403);
    }

    public static function notFound(): self
    {
        return new self('RESOURCE_NOT_FOUND', 'The requested resource is not available.', 404);
    }
}
