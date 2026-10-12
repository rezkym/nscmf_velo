<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Reports\ActivityLogFilters;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * GET /reports/activity-log (12 §47.2). The query keys are an exact allowlist; the filter rules
 * are shared with the export request's `filters`.
 *
 * @phpstan-import-type LogFilters from ActivityLogFilters
 * @phpstan-import-type LogQuery from ActivityLogFilters
 */
final class ActivityLogQueryRequest extends FormRequest
{
    private const array KEYS = ['page', 'per_page', 'q', 'family', 'subtype', 'statuses', 'archived', 'request_date_from', 'request_date_to'];

    /**
     * The filter rules under an optional key prefix (`filters.` for the export body).
     *
     * @return array<string, list<mixed>>
     */
    public static function filterRules(string $prefix = ''): array
    {
        return [
            "{$prefix}q" => ['sometimes', 'nullable', 'string', 'max:64'],
            "{$prefix}family" => ['sometimes', 'nullable', Rule::enum(NscmfFamily::class)],
            "{$prefix}subtype" => ['sometimes', 'nullable', Rule::enum(NscmfSubtype::class)],
            "{$prefix}statuses" => ['sometimes', 'array', 'min:1', 'max:'.count(NscmfStatus::cases())],
            "{$prefix}statuses.*" => ['distinct', Rule::enum(NscmfStatus::class)],
            "{$prefix}archived" => ['sometimes', 'string', Rule::in(ActivityLogFilters::ARCHIVE_VIEWS)],
            "{$prefix}request_date_from" => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            "{$prefix}request_date_to" => ['sometimes', 'nullable', 'date_format:Y-m-d', "after_or_equal:{$prefix}request_date_from"],
        ];
    }

    /**
     * Validated filter values with their defaults.
     *
     * @param  array<mixed>  $input
     * @return LogFilters
     */
    public static function filters(array $input): array
    {
        $string = static fn (string $key): ?string => isset($input[$key]) && is_string($input[$key]) && trim($input[$key]) !== '' ? trim($input[$key]) : null;
        $statuses = isset($input['statuses']) && is_array($input['statuses'])
            ? array_values(array_filter($input['statuses'], 'is_string'))
            : ActivityLogFilters::submittedStatuses();

        return [
            'q' => $string('q'),
            'family' => $string('family'),
            'subtype' => $string('subtype'),
            'statuses' => $statuses,
            'archived' => $string('archived') ?? 'all',
            'request_date_from' => $string('request_date_from'),
            'request_date_to' => $string('request_date_to'),
        ];
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            ...self::filterRules(),
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_keys($this->query->all()) as $key) {
                if (! in_array((string) $key, self::KEYS, true)) {
                    $validator->errors()->add((string) $key, 'This filter is not accepted.');
                }
            }
        }];
    }

    /** @return LogQuery */
    public function logQuery(): array
    {
        return [
            'page' => $this->integer('page', 1),
            'per_page' => $this->integer('per_page', 25),
            ...self::filters($this->validated()),
        ];
    }
}
