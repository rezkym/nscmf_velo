<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Pagination, whitelisted sort and the common `q` filter (12 §13–16). */
final class ListRecordsRequest extends FormRequest
{
    public const array SORTS = ['request_no', 'request_date', 'created_at', 'updated_at', 'business_status', 'family', 'subtype'];

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'string', Rule::in(self::SORTS)],
            'direction' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'q' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }

    /**
     * @return array{page: int, per_page: int, sort: string, direction: string, q: string|null}
     */
    public function listQuery(): array
    {
        return [
            'page' => $this->integer('page', 1),
            'per_page' => $this->integer('per_page', 25),
            'sort' => $this->filled('sort') ? $this->string('sort')->toString() : 'created_at',
            'direction' => $this->filled('direction') ? $this->string('direction')->toString() : 'asc',
            'q' => $this->filled('q') ? $this->string('q')->toString() : null,
        ];
    }
}
