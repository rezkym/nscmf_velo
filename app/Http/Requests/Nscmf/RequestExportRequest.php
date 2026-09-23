<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Domain\Export\ExportFormat;
use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** POST /nscmf/{record}/exports and /nscmf/exports/bulk (12 §65, §71). */
final class RequestExportRequest extends AllowlistedRequest
{
    /** Bulk selections are bounded like one page of a list (12 §13); packaging stays open (G04). */
    public const int MAX_BULK_RECORDS = 100;

    protected function allowedKeys(): array
    {
        return $this->routeIs('nscmf.exports.bulk') ? ['format', 'record_ids'] : ['format'];
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $rules = ['format' => ['required', Rule::enum(ExportFormat::class)]];
        if ($this->routeIs('nscmf.exports.bulk')) {
            $rules['record_ids'] = ['required', 'array', 'min:1', 'max:'.self::MAX_BULK_RECORDS];
            $rules['record_ids.*'] = ['integer', 'min:1'];
        }

        return $rules;
    }

    public function exportFormat(): ExportFormat
    {
        return ExportFormat::from($this->string('format')->toString());
    }

    /** @return list<int> */
    public function recordIds(): array
    {
        return array_values(array_map(static fn (mixed $id): int => is_numeric($id) ? (int) $id : 0, $this->array('record_ids')));
    }
}
