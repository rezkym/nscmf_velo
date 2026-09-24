<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\NumberSequenceRepository;
use App\Repositories\Exceptions\RequestNoTakenException;
use App\Services\Audit\BusinessAuditService;
use App\Services\Security\PermissionGate;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;

/**
 * Creates an NSCMF Draft (12 §25, 11 §13–15): owner and Team are taken from the server-side
 * actor, never from the request. An automatic number is allocated in its own committed step so a
 * later failure never frees it for reuse (11 §15).
 */
final readonly class NscmfCreationService
{
    public function __construct(
        private NscmfRepository $records,
        private NumberSequenceRepository $sequences,
        private BusinessAuditService $businessAudit,
        private PermissionGate $gate,
        private DatabaseManager $database,
    ) {}

    public function create(User $actor, NscmfFamily $family, NscmfSubtype $subtype, NumberingMode $mode, ?string $manualRequestNo): int
    {
        $this->gate->requireAll($actor, 'nscmf.create');

        $team = $actor->team;
        if ($team === null || ! $team->is_active) {
            throw new DomainRuleException('ACTIVE_TEAM_REQUIRED', 'You need an active team to create records. Contact an administrator.', 422);
        }

        if (! $family->allows($subtype)) {
            throw new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, errors: ['subtype' => ['Choose a subtype of the selected family.']]);
        }

        $requestNo = $mode === NumberingMode::AUTOMATIC ? $this->allocateAutomaticNumber() : trim((string) $manualRequestNo);

        try {
            return $this->database->connection()->transaction(function () use ($actor, $team, $family, $subtype, $mode, $requestNo): int {
                $record = $this->records->createWithDetail([
                    'request_no' => $requestNo,
                    'request_no_normalized' => mb_strtolower($requestNo),
                    'numbering_mode' => $mode,
                    'family' => $family,
                    'subtype' => $subtype,
                    'request_date' => null,
                    'owner_user_id' => $actor->id,
                    'team_id' => $team->id,
                    'business_status' => NscmfStatus::DRAFT,
                    'record_version' => 1,
                    'is_archived' => false,
                ], $family);

                $this->businessAudit->record(
                    recordId: $record->id,
                    actorUserId: $actor->id,
                    event: BusinessAuditEvent::RECORD_CREATED,
                    versionAfter: 1,
                    toStatus: NscmfStatus::DRAFT->value,
                    metadata: ['family' => $family->value, 'subtype' => $subtype->value, 'numbering_mode' => $mode->value],
                );

                return $record->id;
            });
        } catch (RequestNoTakenException) {
            throw $mode === NumberingMode::MANUAL
                ? new DomainRuleException('REQUEST_NO_CONFLICT', 'Some fields need to be corrected.', 422, errors: ['request_no' => ['This request number is already used.']])
                : new DomainRuleException('REQUEST_NO_CONFLICT', 'The generated request number is already used by a manual record. Try again to get the next number.', 409);
        }
    }

    /** NSCMF-YYYYMM-##### in the Asia/Jakarta business month (06 §18). */
    private function allocateAutomaticNumber(): string
    {
        $yearMonth = CarbonImmutable::now()->format('Ym');
        $value = $this->database->connection()->transaction(fn (): int => $this->sequences->next($yearMonth));

        return sprintf('NSCMF-%s-%05d', $yearMonth, $value);
    }
}
