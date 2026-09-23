<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf\Workflow;

use App\Http\Requests\AllowlistedRequest;

/** Reviewer Return accepts only its optimistic version and mandatory reason (12 §33, §39). */
final class ReviewReturnRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['record_version', 'reason'];
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'record_version' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }
}
