<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Domain\Shared\DomainRuleException;
use App\Models\Settings\SystemSetting;
use App\Models\User;
use App\Repositories\Contracts\Settings\SystemSettingsRepository;
use App\Services\Audit\SecurityAuditService;
use App\Services\Security\CredentialService;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\DatabaseManager;

/**
 * The protected Technical Log cleanup setting (12 §97–99): Protected Superadmin identity +
 * system.settings.manage (+ fresh re-auth to change). Changing it never deletes logs itself.
 */
final readonly class SystemSettingsService
{
    public function __construct(
        private SystemSettingsRepository $settings,
        private CredentialService $credentials,
        private SecurityAuditService $securityAudit,
        private DatabaseManager $database,
    ) {}

    /** @return array{automatic_cleanup_enabled: bool, retention_value: int, retention_unit: string} */
    public function technicalLogs(User $actor): array
    {
        self::authorize($actor);

        return self::project($this->settings->current());
    }

    /**
     * @param  array{automatic_cleanup_enabled: bool, retention_value: int, retention_unit: string}  $values
     * @return array{automatic_cleanup_enabled: bool, retention_value: int, retention_unit: string}
     */
    public function updateTechnicalLogs(User $actor, Session $session, array $values): array
    {
        $this->credentials->requireFreshReauthentication($session);
        self::authorize($actor);

        return $this->database->connection()->transaction(function () use ($actor, $values): array {
            $setting = $this->settings->lockCurrent();
            $before = self::project($setting);
            $this->settings->update($setting, [
                'technical_log_auto_cleanup_enabled' => $values['automatic_cleanup_enabled'],
                'technical_log_retention_value' => $values['retention_value'],
                'technical_log_retention_unit' => $values['retention_unit'],
                'updated_by_user_id' => $actor->id,
            ]);
            $after = self::project($setting);
            $this->securityAudit->record(
                event: SecurityAuditEvent::SYSTEM_SETTINGS_UPDATED,
                outcome: SecurityAuditOutcome::SUCCESS,
                actorUserId: $actor->id,
                metadata: ['setting' => 'technical_logs', 'before' => array_map(self::scalar(...), array_values($before)), 'after' => array_map(self::scalar(...), array_values($after))],
            );

            return $after;
        });
    }

    private static function authorize(User $actor): void
    {
        if (! $actor->is_protected_superadmin || ! $actor->can('system.settings.manage')) {
            throw new DomainRuleException('SYSTEM_SETTINGS_PROTECTED', 'Only the Protected Superadmin can manage Core System Settings.', 403);
        }
    }

    /** @return array{automatic_cleanup_enabled: bool, retention_value: int, retention_unit: string} */
    private static function project(SystemSetting $setting): array
    {
        return [
            'automatic_cleanup_enabled' => $setting->technical_log_auto_cleanup_enabled,
            'retention_value' => $setting->technical_log_retention_value,
            'retention_unit' => $setting->technical_log_retention_unit,
        ];
    }

    private static function scalar(bool|int|string $value): string
    {
        return is_bool($value) ? ($value ? 'ON' : 'OFF') : (string) $value;
    }
}
