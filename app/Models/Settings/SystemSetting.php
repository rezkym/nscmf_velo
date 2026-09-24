<?php

declare(strict_types=1);

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

/**
 * The typed Core System Settings singleton (11 §12). Only the Technical Log cleanup lives here.
 *
 * @property int $id
 * @property bool $technical_log_auto_cleanup_enabled
 * @property int $technical_log_retention_value
 * @property string $technical_log_retention_unit
 * @property int|null $updated_by_user_id
 */
class SystemSetting extends Model
{
    public const int SINGLETON_ID = 1;

    protected $table = 'system_settings';

    protected $guarded = [];

    public $incrementing = false;

    protected function casts(): array
    {
        return ['technical_log_auto_cleanup_enabled' => 'boolean', 'technical_log_retention_value' => 'integer'];
    }
}
