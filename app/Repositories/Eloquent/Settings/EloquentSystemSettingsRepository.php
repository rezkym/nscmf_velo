<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Settings;

use App\Models\Settings\SystemSetting;
use App\Repositories\Contracts\Settings\SystemSettingsRepository;

final class EloquentSystemSettingsRepository implements SystemSettingsRepository
{
    private const array DEFAULTS = [
        'technical_log_auto_cleanup_enabled' => true,
        'technical_log_retention_value' => 30,
        'technical_log_retention_unit' => 'DAY',
    ];

    public function current(): SystemSetting
    {
        return SystemSetting::query()->firstOrCreate(['id' => SystemSetting::SINGLETON_ID], self::DEFAULTS);
    }

    public function lockCurrent(): SystemSetting
    {
        $this->current();

        return SystemSetting::query()->lockForUpdate()->findOrFail(SystemSetting::SINGLETON_ID);
    }

    public function update(SystemSetting $setting, array $attributes): void
    {
        $setting->forceFill($attributes)->save();
    }
}
