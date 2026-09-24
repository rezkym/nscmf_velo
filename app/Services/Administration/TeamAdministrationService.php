<?php

declare(strict_types=1);

namespace App\Services\Administration;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\Team;
use App\Models\User;
use App\Repositories\Contracts\Administration\TeamRepository;
use App\Services\Audit\SecurityAuditService;
use App\Services\Security\PermissionGate;
use Illuminate\Database\DatabaseManager;

/** Team administration as organizational metadata (04 §18, 12 §93–96). No permission side effect. */
final readonly class TeamAdministrationService
{
    public function __construct(
        private TeamRepository $teams,
        private PermissionGate $gate,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @return list<array{id: int, name: string, is_active: bool}>
     */
    public function list(User $actor): array
    {
        $this->gate->requireAll($actor, 'teams.view');

        return array_values($this->teams->all()->map(fn (Team $team): array => self::row($team))->all());
    }

    public function create(User $actor, string $name): void
    {
        $this->gate->requireAll($actor, 'teams.create');

        $this->database->connection()->transaction(function () use ($actor, $name): void {
            $team = $this->teams->create($name);
            $this->audit($actor, SecurityAuditEvent::TEAM_CREATED, $team);
        });
    }

    public function rename(User $actor, int $teamId, string $name): void
    {
        $this->gate->requireAll($actor, 'teams.update');

        $this->database->connection()->transaction(function () use ($actor, $teamId, $name): void {
            $team = $this->teams->lockForUpdate($teamId) ?? throw DomainRuleException::notFound();
            $this->teams->update($team, ['name' => $name]);
            $this->audit($actor, SecurityAuditEvent::TEAM_UPDATED, $team);
        });
    }

    public function setActive(User $actor, int $teamId, bool $active): void
    {
        $this->gate->requireAll($actor, 'teams.archive');

        $this->database->connection()->transaction(function () use ($actor, $teamId, $active): void {
            $team = $this->teams->lockForUpdate($teamId) ?? throw DomainRuleException::notFound();

            if ($team->is_active === $active) {
                throw new DomainRuleException('TEAM_STATE_CONFLICT', $active ? 'This team is already active.' : 'This team is already inactive.', 409);
            }

            $this->teams->update($team, ['is_active' => $active]);
            $this->audit($actor, $active ? SecurityAuditEvent::TEAM_REACTIVATED : SecurityAuditEvent::TEAM_DEACTIVATED, $team);
        });
    }

    /**
     * @return array{id: int, name: string, is_active: bool}
     */
    public static function row(Team $team): array
    {
        return ['id' => $team->id, 'name' => $team->name, 'is_active' => $team->is_active];
    }

    private function audit(User $actor, SecurityAuditEvent $event, Team $team): void
    {
        $this->securityAudit->record(
            event: $event,
            outcome: SecurityAuditOutcome::SUCCESS,
            actorUserId: $actor->id,
            metadata: ['team_id' => $team->id],
        );
    }
}
