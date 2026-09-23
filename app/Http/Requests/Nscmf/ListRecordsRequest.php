<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Pagination, whitelisted sort and the common record filters (12 §13–16). `team_id` is an
 * informational filter only, never an authorization scope.
 *
 * @phpstan-type ListQuery array{page: int, per_page: int, sort: string, direction: string, q: string|null, family: string|null, subtype: string|null, business_status: string|null, archived: bool|null, request_date_from: string|null, request_date_to: string|null, owner_user_id: int|null, team_id: int|null}
 */
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
            'family' => ['sometimes', 'nullable', Rule::enum(NscmfFamily::class)],
            'subtype' => ['sometimes', 'nullable', Rule::enum(NscmfSubtype::class)],
            'business_status' => ['sometimes', 'nullable', Rule::enum(NscmfStatus::class)],
            'archived' => ['sometimes', 'nullable', 'boolean'],
            'request_date_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'request_date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:request_date_from'],
            'owner_user_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'team_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * @return ListQuery
     */
    public function listQuery(): array
    {
        return [
            'page' => $this->integer('page', 1),
            'per_page' => $this->integer('per_page', 25),
            'sort' => $this->filled('sort') ? $this->string('sort')->toString() : 'created_at',
            'direction' => $this->filled('direction') ? $this->string('direction')->toString() : 'asc',
            'q' => $this->optionalString('q'),
            'family' => $this->optionalString('family'),
            'subtype' => $this->optionalString('subtype'),
            'business_status' => $this->optionalString('business_status'),
            'archived' => $this->filled('archived') ? $this->boolean('archived') : null,
            'request_date_from' => $this->optionalString('request_date_from'),
            'request_date_to' => $this->optionalString('request_date_to'),
            'owner_user_id' => $this->filled('owner_user_id') ? $this->integer('owner_user_id') : null,
            'team_id' => $this->filled('team_id') ? $this->integer('team_id') : null,
        ];
    }

    private function optionalString(string $key): ?string
    {
        return $this->filled($key) ? $this->string($key)->toString() : null;
    }
}
