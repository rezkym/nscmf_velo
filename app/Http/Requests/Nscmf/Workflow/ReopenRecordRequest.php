<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf\Workflow;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Reopen: exactly record_version, reason and destination_status (12 §40). */
final class ReopenRecordRequest extends AllowlistedRequest
{
    public const array DESTINATIONS = ['REVISION_REQUIRED', 'PENDING_REVIEW'];

    protected function allowedKeys(): array
    {
        return ['record_version', 'reason', 'destination_status'];
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'record_version' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
            'destination_status' => ['required', 'string', Rule::in(self::DESTINATIONS)],
        ];
    }
}
