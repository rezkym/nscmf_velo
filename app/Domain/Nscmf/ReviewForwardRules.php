<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;

/** Forward checks persisted Results, independently of the Submit planning/date gates. */
final class ReviewForwardRules
{
    /**
     * @param  array<string, mixed>  $state
     * @return array<string, list<string>>
     */
    public static function errors(NscmfFamily $family, array $state): array
    {
        if ($family !== NscmfFamily::CHANGE) {
            return [];
        }

        $errors = [];
        $complete = 0;
        $fields = ['result_summary', 'performance_information', 'result_status'];
        foreach (is_array($state['results'] ?? null) ? $state['results'] : [] as $index => $row) {
            if (! is_array($row)) {
                continue;
            }
            $filled = array_filter($fields, fn (string $field): bool => is_string($row[$field] ?? null) && trim($row[$field]) !== '');
            if ($filled === []) {
                continue;
            }
            foreach (array_diff($fields, $filled) as $field) {
                $errors["change.results.{$index}.{$field}"] = ['Complete every field of a started Result before forwarding.'];
            }
            if (count($filled) === count($fields)) {
                $complete++;
            }
        }
        if ($complete === 0) {
            $errors['change.results'] = ['Complete at least one Result before forwarding to Approval.'];
        }

        return $errors;
    }
}
