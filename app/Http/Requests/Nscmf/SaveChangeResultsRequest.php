<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Validator;

/** Exactly {record_version, results} (12 §29); any other key is a 422, never ignored. */
final class SaveChangeResultsRequest extends AllowlistedRequest
{
    protected function allowedKeys(): array
    {
        return ['record_version', 'results'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'record_version' => ['required', 'integer', 'min:1'],
            'results' => ['present', 'array', 'list'],
            'results.*' => ['array'],
            'results.*.row_no' => ['required', 'integer', 'between:1,5', 'distinct'],
            'results.*.result_summary' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'results.*.performance_information' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'results.*.result_status' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [...parent::after(), function (Validator $validator): void {
            $rows = $this->input('results');

            foreach (is_array($rows) ? $rows : [] as $index => $row) {
                foreach (array_keys(is_array($row) ? $row : []) as $key) {
                    if (! in_array((string) $key, ['row_no', 'result_summary', 'performance_information', 'result_status'], true)) {
                        $validator->errors()->add("results.{$index}.{$key}", 'This field is not accepted.');
                    }
                }
            }
        }];
    }
}
