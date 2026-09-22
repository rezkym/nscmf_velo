<?php

declare(strict_types=1);

namespace App\Http\Requests\Nscmf;

use App\Domain\Nscmf\DraftStructure;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Http\Requests\AllowlistedRequest;
use Closure;
use Illuminate\Validation\Validator;

/**
 * DRAFT_PERSIST validation of PATCH /nscmf/{record}/draft (06 §5, 12 §26–28): exact nested key
 * allowlists, closed sets, safe lengths and structurally impossible values only. Submission
 * requiredness is not applied here; the family/record match and the header number rules need the
 * record and are checked by the Service.
 */
final class SaveDraftRequest extends AllowlistedRequest
{
    private const string CONTROL_CHARACTERS = '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u';

    private const string DECIMAL_14_3_MAX = '99999999999.999';

    /** Maximum lengths from 11 and 06 §11. */
    private const array TEXT_LIMITS = [
        'customer_name' => 150, 'contact_name' => 150, 'lan_ip_allocation' => 4000, 'domain_name_1' => 253, 'domain_name_2' => 253,
        'service_id' => 100, 'service_description' => 2000, 'service_location' => 500, 'requirement_text' => 1000,
        'maintenance_purpose' => 4000, 'rollback_scenario' => 4000, 'challenge_text' => 1000, 'problem_text' => 1000,
        'other_description' => 500, 'plan_text' => 1000, 'target_kpi' => 1000, 'result_summary' => 2000,
        'performance_information' => 2000, 'result_status' => 255,
    ];

    /** Closed sets (12 §27.2, §28.2). */
    private const array CLOSED_SETS = [
        'reference_type' => ['IWO', 'VELOSHIP', 'TICKET', 'OTHER'],
        'service_context' => ['EXISTING', 'NEW'],
        'service_status' => ['ACTIVATED', 'DEACTIVATED'],
        'impact_code' => ['NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER'],
        'monitoring_period_unit' => ['MINUTE', 'HOUR', 'DAY', 'WEEK'],
        'announcement_timing' => ['ONE_WEEK_BEFORE', 'TWO_WEEKS_BEFORE', 'TWO_DAYS_BEFORE_EMERGENCY'],
    ];

    protected function allowedKeys(): array
    {
        return ['record_version', 'header', 'activation', 'change'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $rules = [
            'record_version' => ['required', 'integer', 'min:1'],
            'header' => ['sometimes', 'array'],
            'header.request_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'header.request_no' => ['sometimes', 'required', 'string', 'max:64', 'regex:'.CreateNscmfRequest::MANUAL_PATTERN],
        ];

        foreach (NscmfFamily::cases() as $family) {
            $root = $family->payloadKey();
            $rules[$root] = ['sometimes', 'array'];

            foreach (DraftStructure::scalars($family) as $field => $kind) {
                $rules["{$root}.{$field}"] = ['sometimes', ...$this->valueRules($field, $kind)];
            }

            foreach (DraftStructure::collections($family) as $name => $definition) {
                $rules["{$root}.{$name}"] = ['sometimes', 'array', 'list'];
                $rules["{$root}.{$name}.*"] = ['array'];
                $rules["{$root}.{$name}.*.{$definition['key']}"] = $definition['max_row'] === null
                    ? ['required', 'string', 'in:'.implode(',', self::CLOSED_SETS[$definition['key']]), 'distinct']
                    : ['required', 'integer', 'between:1,'.$definition['max_row'], 'distinct'];

                foreach ($definition['fields'] as $field => $kind) {
                    $rules["{$root}.{$name}.*.{$field}"] = ['sometimes', ...$this->valueRules($field, $kind)];
                }
            }

            foreach (DraftStructure::sites($family) as $site => $fields) {
                $rules["{$root}.{$site}"] = ['sometimes', 'nullable', 'array', 'min:1'];

                foreach ($fields as $field => $kind) {
                    $rules["{$root}.{$site}.{$field}"] = ['sometimes', ...$this->valueRules($field, $kind)];
                }
            }
        }

        return $rules;
    }

    /**
     * @return list<mixed>
     */
    private function valueRules(string $field, string $kind): array
    {
        if (isset(self::CLOSED_SETS[$field])) {
            return ['nullable', 'string', 'in:'.implode(',', self::CLOSED_SETS[$field])];
        }

        return match ($kind) {
            DraftStructure::DATE => ['nullable', 'date_format:Y-m-d'],
            DraftStructure::BOOLEAN => [self::strictBoolean()],
            DraftStructure::INTEGER => ['nullable', 'integer', 'between:1,4094'],
            DraftStructure::DECIMAL => match ($field) {
                'latency_ms' => ['nullable', 'numeric', 'min:0', 'max:'.self::DECIMAL_14_3_MAX],
                'packet_loss_percent' => ['nullable', 'numeric', 'between:0,100'],
                'rssi' => ['nullable', 'numeric', 'between:-999999999.999,999999999.999'],
                default => ['nullable', 'numeric', 'gt:0', 'max:'.self::DECIMAL_14_3_MAX],
            },
            default => ['nullable', 'string', 'max:'.(self::TEXT_LIMITS[$field] ?? 255), 'not_regex:'.self::CONTROL_CHARACTERS],
        };
    }

    /** JSON boolean only (12 §7.3); a present migration flag is never null. */
    private static function strictBoolean(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_bool($value)) {
                $fail('The :attribute field must be true or false.');
            }
        };
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [...parent::after(), function (Validator $validator): void {
            $this->rejectUnknownKeys($validator, 'header', ['request_date', 'request_no']);

            foreach (NscmfFamily::cases() as $family) {
                $root = $family->payloadKey();
                $collections = DraftStructure::collections($family);
                $sites = DraftStructure::sites($family);

                $this->rejectUnknownKeys($validator, $root, [...array_keys(DraftStructure::scalars($family)), ...array_keys($collections), ...array_keys($sites)]);

                foreach ($collections as $name => $definition) {
                    $rows = $this->input("{$root}.{$name}");
                    foreach (is_array($rows) ? array_keys($rows) : [] as $index) {
                        $this->rejectUnknownKeys($validator, "{$root}.{$name}.{$index}", [$definition['key'], ...array_keys($definition['fields'])]);
                    }
                }

                foreach ($sites as $site => $fields) {
                    $this->rejectUnknownKeys($validator, "{$root}.{$site}", array_keys($fields));
                }
            }
        }];
    }

    /**
     * @param  list<string>  $allowed
     */
    private function rejectUnknownKeys(Validator $validator, string $path, array $allowed): void
    {
        $value = $this->input($path);

        if (! is_array($value) || array_is_list($value)) {
            return;
        }

        foreach (array_keys($value) as $key) {
            if (! in_array((string) $key, $allowed, true)) {
                $validator->errors()->add("{$path}.{$key}", 'This field is not accepted.');
            }
        }
    }
}
