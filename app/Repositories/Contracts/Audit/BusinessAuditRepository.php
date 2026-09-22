<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Audit;

interface BusinessAuditRepository
{
    /**
     * Appends one Business Audit event and its field changes. There is no update or delete.
     *
     * @param  array<string, mixed>  $event
     * @param  list<array{field_path: string, value_kind: string|null, old_value_text: string|null, new_value_text: string|null}>  $changes
     */
    public function appendEvent(array $event, array $changes): int;
}
