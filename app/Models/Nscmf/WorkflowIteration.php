<?php

declare(strict_types=1);

namespace App\Models\Nscmf;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A workflow iteration and its sign-offs (11 §31).
 *
 * @property int $id
 * @property int $nscmf_record_id
 * @property int $iteration_no
 * @property int|null $reviewed_by_user_id
 * @property CarbonImmutable|null $reviewed_at
 * @property int|null $approved_by_user_id
 * @property CarbonImmutable|null $approved_at
 * @property-read User|null $reviewedBy
 * @property-read User|null $approvedBy
 */
class WorkflowIteration extends Model
{
    protected $table = 'nscmf_workflow_iterations';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return [
            'started_at' => 'immutable_datetime',
            'reviewed_at' => 'immutable_datetime',
            'approved_at' => 'immutable_datetime',
            'closed_at' => 'immutable_datetime',
            'superseded_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
