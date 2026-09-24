<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Audit;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use stdClass;

interface SecurityAuditRepository
{
    /**
     * @param  array<string, mixed>  $event
     */
    public function appendEvent(array $event): int;

    /**
     * Newest first, with actor and target references joined; metadata is never selected.
     *
     * @param  array{page: int, per_page: int, event_type: string|null, actor_user_id: int|null, occurred_from: string|null, occurred_to: string|null, outcome: string|null}  $filters
     * @return LengthAwarePaginator<int, stdClass>
     */
    public function paginate(array $filters): LengthAwarePaginator;
}
