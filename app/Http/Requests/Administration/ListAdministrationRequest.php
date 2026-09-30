<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Standard pagination and a name search for the Users, Roles and Teams lists (12 §13, §80, §88,
 * §93). The Service checks the list's view permission.
 *
 * @phpstan-type AdministrationListQuery array{page: int, per_page: int, q: string|null}
 */
final class ListAdministrationRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'q' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }

    /**
     * @return AdministrationListQuery
     */
    public function listQuery(): array
    {
        return [
            'page' => $this->integer('page', 1),
            'per_page' => $this->integer('per_page', 25),
            'q' => $this->filled('q') ? $this->string('q')->trim()->toString() : null,
        ];
    }
}
