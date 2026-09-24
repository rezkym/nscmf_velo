<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;

/** PATCH /administration/settings/technical-logs — exactly the three wire keys (12 §99). */
final class TechnicalLogSettingRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['automatic_cleanup_enabled', 'retention_value', 'retention_unit'];
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'automatic_cleanup_enabled' => ['required', 'boolean'],
            'retention_value' => ['required', 'integer', 'min:1'],
            'retention_unit' => ['required', 'string', 'in:DAY,MONTH'],
        ];
    }

    /** @return array{automatic_cleanup_enabled: bool, retention_value: int, retention_unit: string} */
    public function values(): array
    {
        return [
            'automatic_cleanup_enabled' => $this->boolean('automatic_cleanup_enabled'),
            'retention_value' => $this->integer('retention_value'),
            'retention_unit' => $this->string('retention_unit')->toString(),
        ];
    }
}
