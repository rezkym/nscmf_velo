<?php

declare(strict_types=1);

namespace App\Models\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One NSCMF record (11 §13). Relations and casts only; workflow lives in Services.
 *
 * @property int $id
 * @property string $request_no
 * @property string $request_no_normalized
 * @property NumberingMode $numbering_mode
 * @property NscmfFamily $family
 * @property NscmfSubtype $subtype
 * @property CarbonImmutable|null $request_date
 * @property int $owner_user_id
 * @property int $team_id
 * @property NscmfStatus $business_status
 * @property int $record_version
 * @property int|null $requested_by_user_id
 * @property CarbonImmutable|null $first_submitted_at
 * @property int|null $current_workflow_iteration_id
 * @property bool $is_archived
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read User $owner
 * @property-read Team $team
 * @property-read User|null $requestedBy
 * @property-read WorkflowIteration|null $currentIteration
 */
class NscmfRecord extends Model
{
    protected $table = 'nscmf_records';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'numbering_mode' => NumberingMode::class,
            'family' => NscmfFamily::class,
            'subtype' => NscmfSubtype::class,
            'business_status' => NscmfStatus::class,
            'request_date' => 'immutable_date',
            'first_submitted_at' => 'immutable_datetime',
            'archived_at' => 'immutable_datetime',
            'is_archived' => 'boolean',
            'record_version' => 'integer',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    /** @return BelongsTo<WorkflowIteration, $this> */
    public function currentIteration(): BelongsTo
    {
        return $this->belongsTo(WorkflowIteration::class, 'current_workflow_iteration_id');
    }
}
