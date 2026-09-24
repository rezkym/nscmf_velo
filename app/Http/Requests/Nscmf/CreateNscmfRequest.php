<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Exactly {family, subtype, numbering_mode, request_no} (12 §25); owner/Team are server-side. */
final class CreateNscmfRequest extends AllowlistedRequest
{
    public const string MANUAL_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9._\/-]{2,63}$/';

    protected function allowedKeys(): array
    {
        return ['family', 'subtype', 'numbering_mode', 'request_no'];
    }

    protected function anyPermission(): array
    {
        return ['nscmf.create'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $family = NscmfFamily::tryFrom($this->string('family')->toString());
        $subtypes = $family === null ? array_column(NscmfSubtype::cases(), 'value') : array_map(fn (NscmfSubtype $s) => $s->value, $family->subtypes());

        return [
            'family' => ['required', 'string', Rule::enum(NscmfFamily::class)],
            'subtype' => ['required', 'string', Rule::in($subtypes)],
            'numbering_mode' => ['required', 'string', Rule::enum(NumberingMode::class)],
            'request_no' => $this->input('numbering_mode') === NumberingMode::MANUAL->value
                ? ['required', 'string', 'max:64', 'regex:'.self::MANUAL_PATTERN, Rule::unique('nscmf_records', 'request_no_normalized')]
                : ['nullable', 'prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'request_no.regex' => 'Use 3 to 64 characters: letters, numbers, dot, underscore, slash or dash, starting with a letter or number.',
            'request_no.unique' => 'This request number is already used.',
            'request_no.prohibited' => 'Automatic numbering does not accept a request number.',
        ];
    }
}
