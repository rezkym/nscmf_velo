<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Http\Requests\AllowlistedRequest;

/** POST /nscmf/{record}/attachment-uploads (12 §52). The fingerprint is a resume hint only. */
final class InitiateUploadRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['filename', 'size_bytes', 'mime_type', 'fingerprint_sha256'];
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'filename' => ['required', 'string', 'max:255'],
            'size_bytes' => ['required', 'integer', 'min:0'],
            'mime_type' => ['sometimes', 'nullable', 'string', 'max:150'],
            'fingerprint_sha256' => ['sometimes', 'nullable', 'string', 'regex:/\A[0-9a-f]{64}\z/'],
        ];
    }
}
