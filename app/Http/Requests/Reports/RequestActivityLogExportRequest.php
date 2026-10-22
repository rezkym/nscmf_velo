<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Domain\Export\ExportFormat;
use App\Domain\Reports\ActivityLogFilters;
use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/**
 * POST /reports/activity-log/exports (12 §47.2). Body keys are an exact allowlist.
 *
 * @phpstan-import-type LogFilters from ActivityLogFilters
 */
final class RequestActivityLogExportRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['format', 'scope', 'filters', 'record_ids', 'site_location', 'prepared_by', 'acknowledged_by'];
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'format' => ['required', Rule::enum(ExportFormat::class)],
            'scope' => ['required', Rule::in(['FILTERED', 'SELECTED'])],
            'filters' => ['nullable', 'array:q,family,subtype,statuses,archived,request_date_from,request_date_to', 'required_if:scope,FILTERED'],
            ...ActivityLogQueryRequest::filterRules('filters.'),
            'record_ids' => ['sometimes', 'array', 'max:'.ActivityLogFilters::MAX_ENTRIES, 'required_if:scope,SELECTED'],
            'record_ids.*' => ['integer', 'min:1', 'distinct'],
            'site_location' => ['required', 'array:noc15,noc23'],
            'site_location.noc15' => ['required', 'boolean'],
            'site_location.noc23' => ['required', 'boolean'],
            'prepared_by' => ['required', 'array:name,date'],
            'prepared_by.name' => ['required', 'string', 'max:150'],
            'prepared_by.date' => ['required', 'date_format:Y-m-d'],
            'acknowledged_by' => ['present', 'nullable', 'array:name,date'],
            'acknowledged_by.name' => ['nullable', 'string', 'max:150'],
            'acknowledged_by.date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    public function exportFormat(): ExportFormat
    {
        return ExportFormat::from($this->string('format')->toString());
    }

    public function selected(): bool
    {
        return $this->string('scope')->toString() === 'SELECTED';
    }

    /** @return LogFilters */
    public function filters(): array
    {
        $filters = $this->validated('filters');

        return ActivityLogQueryRequest::filters(is_array($filters) ? $filters : []);
    }

    /** @return list<int> */
    public function recordIds(): array
    {
        return array_values(array_map(static fn (mixed $id): int => is_numeric($id) ? (int) $id : 0, $this->array('record_ids')));
    }

    /** @return array{noc15: bool, noc23: bool} */
    public function siteLocation(): array
    {
        return ['noc15' => $this->boolean('site_location.noc15'), 'noc23' => $this->boolean('site_location.noc23')];
    }

    /** @return array{name: string|null, date: string|null} */
    public function person(string $key): array
    {
        $name = trim($this->string("{$key}.name")->toString());
        $date = $this->string("{$key}.date")->toString();

        return ['name' => $name === '' ? null : $name, 'date' => $date === '' ? null : $date];
    }
}
