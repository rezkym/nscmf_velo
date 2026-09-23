<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf\Workflow;

use App\Http\Requests\AllowlistedRequest;

/** Cancel Draft: the version precondition and an optional reason (12 §31, §39). */
final class CancelRecordRequest extends AllowlistedRequest
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
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
