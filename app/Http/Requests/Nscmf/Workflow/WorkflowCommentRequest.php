<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf\Workflow;

use App\Http\Requests\AllowlistedRequest;
use Closure;

/** Exact input for Forward and Approve: an optional comment (12 §39). */
final class WorkflowCommentRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['record_version', 'comment'];
    }

    /** @return array<string, list<string|Closure>> */
    public function rules(): array
    {
        return [
            'record_version' => [
                'required', 'integer', 'min:1',
                static function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_int($value) && ! is_string($value)) {
                        $fail('The record version must be an integer.');
                    }
                },
            ],
            'comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
