<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Audit;

use Illuminate\Database\Query\Builder;

/** The filters both privileged audit tables share, bound as parameters (12 §49–50). */
final class AuditFilters
{
    /**
     * @param  array{event_type: string|null, actor_user_id: int|null, occurred_from: string|null, occurred_to: string|null}  $filters
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['event_type'] !== null, fn (Builder $builder) => $builder->where('events.event_type', $filters['event_type']))
            ->when($filters['actor_user_id'] !== null, fn (Builder $builder) => $builder->where('events.actor_user_id', $filters['actor_user_id']))
            ->when($filters['occurred_from'] !== null, fn (Builder $builder) => $builder->where('events.occurred_at', '>=', $filters['occurred_from'].' 00:00:00'))
            ->when($filters['occurred_to'] !== null, fn (Builder $builder) => $builder->where('events.occurred_at', '<=', $filters['occurred_to'].' 23:59:59.999999'))
            ->orderByDesc('events.occurred_at')
            ->orderByDesc('events.id');
    }
}
