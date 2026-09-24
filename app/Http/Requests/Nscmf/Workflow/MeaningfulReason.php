<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf\Workflow;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A mandatory reason carries at least five meaningful characters (06 §54; 12 §39), decided
 * 2026-09-24 as five characters other than whitespace, so padding cannot stand in for a reason.
 */
final class MeaningfulReason implements ValidationRule
{
    private const int MINIMUM = 5;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || mb_strlen((string) preg_replace('/\s+/u', '', $value)) < self::MINIMUM) {
            $fail('The reason needs at least 5 characters that are not spaces.');
        }
    }
}
