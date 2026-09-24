<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Exact keys confirmed 2026-09-22 (12 §78): minimum 6, no composition rule. */
final class ChangeTemporaryPasswordRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:'.config()->integer('security.password.min_length'), 'max:255', 'confirmed'],
        ];
    }
}
