<?php

declare(strict_types=1);

namespace App\Models\Audit;

use App\Models\Nscmf\WorkflowIteration;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $nscmf_record_id
 * @property int|null $workflow_iteration_id
 * @property int|null $actor_user_id
 * @property string $actor_type
 * @property string $event_type
 * @property string|null $from_status
 * @property string|null $to_status
 * @property string|null $reason
 * @property string|null $comment
 * @property int|null $record_version_before
 * @property int|null $record_version_after
 * @property CarbonImmutable $occurred_at
 * @property-read User|null $actor
 * @property-read WorkflowIteration|null $iteration
 * @property-read Collection<int, BusinessAuditChangeRecord> $changes
 */
class BusinessAuditEventRecord extends Model
{
    use AppendOnly;

    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $table = 'business_audit_events';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['metadata_json' => 'array', 'occurred_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    /** @return BelongsTo<WorkflowIteration, $this> */
    public function iteration(): BelongsTo
    {
        return $this->belongsTo(WorkflowIteration::class, 'workflow_iteration_id');
    }

    /** @return HasMany<BusinessAuditChangeRecord, $this> */
    public function changes(): HasMany
    {
        return $this->hasMany(BusinessAuditChangeRecord::class, 'business_audit_event_id')->orderBy('id');
    }
}
