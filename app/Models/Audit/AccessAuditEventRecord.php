<?php

declare(strict_types=1);

namespace App\Models\Audit;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $event_type
 */
class AccessAuditEventRecord extends Model
{
    use AppendOnly;

    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $table = 'access_audit_events';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['occurred_at' => 'immutable_datetime'];
    }
}
