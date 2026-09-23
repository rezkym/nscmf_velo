<?php

declare(strict_types=1);

namespace App\Models\Audit;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $business_audit_event_id
 * @property string $field_path
 * @property string|null $old_value_text
 * @property string|null $new_value_text
 */
class BusinessAuditChangeRecord extends Model
{
    use AppendOnly;

    public $timestamps = false;

    protected $table = 'business_audit_changes';

    protected $guarded = ['id'];
}
