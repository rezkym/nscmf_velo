<?php

declare(strict_types=1);

namespace App\Models\Audit;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $event_type
 */
class SecurityAuditEventRecord extends Model
{
    use AppendOnly;

    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $table = 'security_audit_events';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['metadata_json' => 'array', 'occurred_at' => 'immutable_datetime'];
    }
}
