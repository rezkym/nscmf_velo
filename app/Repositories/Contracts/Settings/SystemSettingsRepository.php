<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Settings;

use App\Models\Settings\SystemSetting;

interface SystemSettingsRepository
{
    /** The singleton; a missing row is created with the locked defaults ON/30/DAY only (BE-125). */
    public function current(): SystemSetting;

    public function lockCurrent(): SystemSetting;

    /** @param array<string, mixed> $attributes */
    public function update(SystemSetting $setting, array $attributes): void;
}
