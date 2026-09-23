<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Repositories\Contracts\Audit\AccessAuditRepository;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use stdClass;

/**
 * Read-only privileged audit views (07 §37, 12 §49–50). Viewing is itself Access Audit
 * evidence; no edit, delete or purge path exists. Security metadata is never exposed.
 *
 * @phpstan-type AuditFilters array{page: int, per_page: int, event_type: string|null, actor_user_id: int|null, occurred_from: string|null, occurred_to: string|null, outcome: string|null}
 */
final readonly class AuditReadService
{
    public function __construct(
        private AccessAuditRepository $access,
        private SecurityAuditRepository $security,
        private AccessAuditService $accessAudit,
    ) {}

    /**
     * @param  AuditFilters  $filters
     * @return array<string, mixed>
     */
    public function accessEvents(User $actor, array $filters): array
    {
        $this->authorize($actor, 'audit.access.view');

        return self::page($this->access->paginate($filters), $filters, static fn (stdClass $row): array => [
            'id' => $row->id,
            'event_type' => $row->event_type,
            'occurred_at' => $row->occurred_at,
            'actor' => self::ref($row->actor_user_id, $row->actor_name),
            'record' => $row->nscmf_record_id === null ? null : ['id' => $row->nscmf_record_id, 'request_no' => $row->request_no],
            'attachment_id' => $row->attachment_id,
            'export_request_id' => $row->export_request_id,
        ]);
    }

    /**
     * @param  AuditFilters  $filters
     * @return array<string, mixed>
     */
    public function securityEvents(User $actor, array $filters): array
    {
        $this->authorize($actor, 'audit.security.view');

        return self::page($this->security->paginate($filters), $filters, static fn (stdClass $row): array => [
            'id' => $row->id,
            'event_type' => $row->event_type,
            'outcome' => $row->outcome,
            'occurred_at' => $row->occurred_at,
            'actor' => self::ref($row->actor_user_id, $row->actor_name),
            'target' => self::ref($row->target_user_id, $row->target_name),
            'subject_username' => $row->subject_username,
            'ip_address' => $row->ip_address,
            'record_id' => $row->nscmf_record_id,
        ]);
    }

    private function authorize(User $actor, string $permission): void
    {
        if (! $actor->can($permission)) {
            throw DomainRuleException::forbidden();
        }
        $this->accessAudit->record($actor->id, AccessAuditEvent::PRIVILEGED_AUDIT_VIEWED);
    }

    /**
     * @param  LengthAwarePaginator<int, stdClass>  $paginator
     * @param  AuditFilters  $filters
     * @param  callable(stdClass): array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private static function page(LengthAwarePaginator $paginator, array $filters, callable $row): array
    {
        return [
            'items' => array_map($row, $paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'query' => $filters,
        ];
    }

    /**
     * @return array{id: mixed, name: mixed}|null
     */
    private static function ref(mixed $id, mixed $name): ?array
    {
        return $id === null ? null : ['id' => $id, 'name' => $name];
    }
}
