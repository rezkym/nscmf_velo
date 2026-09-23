<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Http\Requests\AllowlistedRequest;

/** Exactly {record_version} as the stale-UI precondition (12 §21, §30). */
final class SubmitRecordRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['record_version'];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['record_version' => ['required', 'integer', 'min:1']];
    }
}
