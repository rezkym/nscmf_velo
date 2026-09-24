<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Pagination and allowlisted filters for the privileged audit viewers (12 §13, §49–50). */
final class ListAuditRequest extends FormRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $security = $this->routeIs('administration.audits.security');

        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'event_type' => ['sometimes', 'nullable', Rule::enum($security ? SecurityAuditEvent::class : AccessAuditEvent::class)],
            'actor_user_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'occurred_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'occurred_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:occurred_from'],
            'outcome' => $security ? ['sometimes', 'nullable', Rule::enum(SecurityAuditOutcome::class)] : ['prohibited'],
        ];
    }

    /**
     * @return array{page: int, per_page: int, event_type: string|null, actor_user_id: int|null, occurred_from: string|null, occurred_to: string|null, outcome: string|null}
     */
    public function filters(): array
    {
        return [
            'page' => $this->integer('page', 1),
            'per_page' => $this->integer('per_page', 25),
            'event_type' => $this->filled('event_type') ? $this->string('event_type')->toString() : null,
            'actor_user_id' => $this->filled('actor_user_id') ? $this->integer('actor_user_id') : null,
            'occurred_from' => $this->filled('occurred_from') ? $this->string('occurred_from')->toString() : null,
            'occurred_to' => $this->filled('occurred_to') ? $this->string('occurred_to')->toString() : null,
            'outcome' => $this->filled('outcome') ? $this->string('outcome')->toString() : null,
        ];
    }
}
