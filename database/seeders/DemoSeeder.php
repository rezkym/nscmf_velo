<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Models\Team;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Nscmf\NscmfChangeResultService;
use App\Services\Nscmf\NscmfCreationService;
use App\Services\Nscmf\NscmfDraftService;
use App\Services\Nscmf\NscmfLifecycleService;
use App\Services\Nscmf\NscmfWorkflowService;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Local/development demo dataset (17 §7–73): three Demo Teams, six demo accounts and twenty
 * DEMO-* records. Every scenario is played through the real workflow services on a fixed
 * Asia/Jakarta clock, so versions, iterations, sign-offs and Business Audit stay coherent and
 * nothing (attachments, exports, signatures) is faked. Existing demo rows are never overwritten.
 *
 * Run explicitly: php artisan db:seed --class=DemoSeeder (staging also needs NSCMF_DEMO_SEED_STAGING=true).
 */
final class DemoSeeder extends Seeder
{
    private const array TEAMS = ['Demo Team Alpha', 'Demo Team Beta', 'Demo Team Gamma'];

    /** username => [name, team, roles, active] (17 §26) */
    private const array USERS = [
        'demo.requester.a' => ['Demo Requester A', 'Demo Team Alpha', ['Requester'], true],
        'demo.requester.b' => ['Demo Requester B', 'Demo Team Beta', ['Requester'], true],
        'demo.reviewer' => ['Demo Reviewer', 'Demo Team Gamma', ['Reviewer'], true],
        'demo.approver' => ['Demo Approver', 'Demo Team Alpha', ['Approver'], true],
        'demo.multi' => ['Demo Multi Role', 'Demo Team Beta', ['Reviewer', 'Approver'], true],
        'demo.disabled' => ['Demo Disabled User', 'Demo Team Gamma', ['Requester'], false],
    ];

    /** @var array<string, User> */
    private array $actors = [];

    private CarbonImmutable $clock;

    public function __construct(
        private readonly NscmfCreationService $creation,
        private readonly NscmfDraftService $drafts,
        private readonly NscmfChangeResultService $results,
        private readonly NscmfWorkflowService $workflow,
        private readonly NscmfLifecycleService $lifecycle,
        private readonly NscmfRepository $records,
    ) {}

    public function run(): void
    {
        self::assertEnvironmentAllowsDemo();
        (new ReferenceDataSeeder)->run();
        $superadmin = User::query()->where('username', 'superadmin')->where('is_protected_superadmin', true)->first()
            ?? throw new RuntimeException('Bootstrap the Protected Superadmin first: php artisan nscmf:bootstrap-superadmin');

        DB::transaction(function () use ($superadmin): void {
            $this->teamsAndUsers();
            $this->actors['superadmin'] = $superadmin;
            try {
                foreach ($this->scenarios() as $requestNo => [$day, $scenario]) {
                    if (DB::table('nscmf_records')->where('request_no_normalized', mb_strtolower($requestNo))->exists()) {
                        continue; // create-if-missing: never overwrite a human's changes (17 §71)
                    }
                    $this->clock = CarbonImmutable::parse("2026-09-{$day} 08:00:00", 'Asia/Jakarta');
                    $this->tick();
                    $scenario($requestNo);
                }
            } finally {
                Carbon::setTestNow();
                CarbonImmutable::setTestNow();
            }
        });
    }

    /** Production is hard-blocked and staging needs an explicit opt-in, before any write (17 §8–9). */
    private static function assertEnvironmentAllowsDemo(): void
    {
        $environment = app()->environment();
        $allowed = in_array($environment, ['local', 'development', 'testing'], true)
            || ($environment === 'staging' && config()->boolean('nscmf.demo_seed_staging'));
        if (! $allowed) {
            throw new RuntimeException("The demo dataset is not allowed in the [{$environment}] environment.");
        }
    }

    private function teamsAndUsers(): void
    {
        $teams = [];
        foreach (self::TEAMS as $name) {
            $teams[$name] = Team::query()->firstOrCreate(['name' => $name], ['is_active' => true]);
        }
        foreach (self::USERS as $username => [$name, $team, $roles, $active]) {
            $user = User::query()->where('username', $username)->first();
            if ($user === null) {
                $user = User::query()->create([
                    'username' => $username, 'name' => $name, 'password' => 'password', 'team_id' => $teams[$team]->id,
                    'is_active' => $active, 'must_change_password' => false, 'is_protected_superadmin' => false,
                ]);
                $user->assignRole($roles);
            }
            $this->actors[$username] = $user;
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * request_no => [day of September 2026, scenario] (17 §35–36).
     *
     * @return array<string, array{string, callable(string): mixed}>
     */
    private function scenarios(): array
    {
        $a = 'demo.requester.a';
        $b = 'demo.requester.b';

        return [
            'DEMO-ACT-001' => ['01', fn (string $no) => $this->draft($this->create($a, $no, 'ACTIVATION'), $a, ['customer_name' => 'Demo Customer Draft'])],
            'DEMO-ACT-002' => ['02', fn (string $no) => $this->submitted($b, $no, 'ACTIVATION', 2)],
            'DEMO-ACT-003' => ['03', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'UPGRADE_DOWNGRADE', 3);
                $this->act('returnForRevision', 'demo.reviewer', $id, 'Demo: please confirm the new bandwidth.');
            }],
            'DEMO-ACT-004' => ['04', function (string $no) use ($b): void {
                $id = $this->submitted($b, $no, 'UPGRADE_DOWNGRADE', 4);
                $this->act('returnForRevision', 'demo.reviewer', $id, 'Demo: add the existing service location.');
                $this->act('submit', $b, $id);
                $this->act('forward', 'demo.multi', $id);
            }],
            'DEMO-ACT-005' => ['05', fn (string $no) => $this->approved($this->submitted($a, $no, 'ACTIVATION', 5), 'demo.reviewer', 'demo.approver')],
            'DEMO-ACT-006' => ['06', fn (string $no) => $this->act('reject', 'demo.reviewer', $this->submitted($b, $no, 'DEACTIVATION', 6), 'Demo: the service is still in contract.')],
            'DEMO-ACT-007' => ['07', function (string $no) use ($a): void {
                $id = $this->create($a, $no, 'DEACTIVATION');
                $this->draft($id, $a, ['customer_name' => 'Demo Customer Cancelled']);
                $this->act('cancel', $a, $id, 'Demo: raised by mistake.');
            }],
            'DEMO-ACT-008' => ['08', function (string $no) use ($b): void {
                $id = $this->submitted($b, $no, 'UPGRADE_DOWNGRADE', 8);
                $this->approved($id, 'demo.reviewer', 'demo.approver');
                $this->act('archive', 'superadmin', $id, 'Demo: completed and filed.');
            }],
            'DEMO-ACT-009' => ['09', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'ACTIVATION', 9);
                $this->act('forward', 'demo.reviewer', $id);
                $this->act('returnToRequester', 'demo.approver', $id, 'Demo: the RFS date moved.');
                $this->act('submit', $a, $id);
                $this->approved($id, 'demo.reviewer', 'demo.approver');
                $this->act('reopen', 'superadmin', $id, 'Demo: customer changed the scope.', NscmfStatus::REVISION_REQUIRED);
            }],
            'DEMO-ACT-010' => ['10', function (string $no) use ($b): void {
                $id = $this->submitted($b, $no, 'DEACTIVATION', 10);
                $this->act('reject', 'demo.reviewer', $id, 'Demo: missing termination letter.');
                $this->act('reopen', 'superadmin', $id, 'Demo: termination letter received.', NscmfStatus::PENDING_REVIEW);
            }],
            'DEMO-CHG-001' => ['11', fn (string $no) => $this->draft($this->create($a, $no, 'MAINTENANCE'), $a, ['maintenance_purpose' => 'Demo draft maintenance.'])],
            'DEMO-CHG-002' => ['12', fn (string $no) => $this->submitted($b, $no, 'MAINTENANCE', 12, ['NOC23'])],
            'DEMO-CHG-003' => ['13', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'UPGRADE', 13, ['NOC361', 'REGIONAL']);
                $this->resultRows($a, $id, 2);
            }],
            'DEMO-CHG-004' => ['14', fn (string $no) => $this->act('returnForRevision', 'demo.reviewer', $this->submitted($b, $no, 'EMERGENCY', 14, ['POP']), 'Demo: attach the rollback owner.')],
            'DEMO-CHG-005' => ['15', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'MAINTENANCE', 15, ['CUSTOMER']);
                $this->resultRows($a, $id, 1);
                $this->act('forward', 'demo.reviewer', $id);
            }],
            'DEMO-CHG-006' => ['16', function (string $no) use ($b): void {
                $id = $this->submitted($b, $no, 'UPGRADE', 16, ['OTHER', 'NOC15']);
                $this->resultRows($b, $id, 3);
                $this->approved($id, 'demo.multi', 'demo.multi');
            }],
            'DEMO-CHG-007' => ['17', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'EMERGENCY', 17, ['NOC15']);
                $this->resultRows($a, $id, 1);
                $this->act('forward', 'demo.reviewer', $id);
                $this->act('rejectApproval', 'demo.approver', $id, 'Demo: the risk is not acceptable this quarter.');
            }],
            'DEMO-CHG-008' => ['18', function (string $no) use ($b): void {
                $id = $this->create($b, $no, 'MAINTENANCE');
                $this->act('cancel', $b, $id);
                // G20: a never-submitted record is visible to its owner only (12 §17.1); no demo actor may archive it.
            }],
            'DEMO-CHG-009' => ['19', function (string $no) use ($a): void {
                $id = $this->submitted($a, $no, 'EMERGENCY', 19, ['NOC23', 'CUSTOMER']);
                $this->resultRows($a, $id, 5);
                $this->approved($id, 'demo.reviewer', 'demo.approver');
                $this->act('archive', 'superadmin', $id, 'Demo: emergency closed and filed.');
            }],
            'DEMO-CHG-010' => ['20', function (string $no) use ($b): void {
                $id = $this->submitted($b, $no, 'UPGRADE', 20, ['POP']);
                $this->resultRows($b, $id, 1);
                $this->act('forward', 'demo.reviewer', $id);
                $this->act('returnToReviewer', 'demo.approver', $id, 'Demo: review the KPI once more.');
            }],
        ];
    }

    private function create(string $owner, string $requestNo, string $subtype): int
    {
        $subtypeEnum = NscmfSubtype::from($subtype);
        $family = NscmfFamily::ACTIVATION->allows($subtypeEnum) ? NscmfFamily::ACTIVATION : NscmfFamily::CHANGE;
        $id = $this->creation->create($this->actors[$owner], $family, $subtypeEnum, NumberingMode::MANUAL, $requestNo);
        $this->tick();

        return $id;
    }

    /** @param array<string, mixed> $fields */
    private function draft(int $recordId, string $owner, array $fields): void
    {
        $record = $this->records->find($recordId) ?? throw new RuntimeException('Demo record vanished.');
        $this->drafts->save($this->actors[$owner], $recordId, [
            'record_version' => $record->record_version,
            'header' => ['request_date' => $this->clock->toDateString()],
            $record->family->payloadKey() => $fields,
        ]);
        $this->tick();
    }

    /**
     * A complete Draft submitted once: iteration 1 with the owner as Requested By.
     *
     * @param  list<string>  $impacts
     */
    private function submitted(string $owner, string $requestNo, string $subtype, int $seed, array $impacts = []): int
    {
        $id = $this->create($owner, $requestNo, $subtype);
        $this->draft($id, $owner, $impacts === [] ? self::activation($subtype, $seed) : self::change($subtype, $seed, $impacts));
        $this->act('submit', $owner, $id);

        return $id;
    }

    private function approved(int $recordId, string $reviewer, string $approver): void
    {
        $this->act('forward', $reviewer, $recordId);
        $this->act('approve', $approver, $recordId);
    }

    private function resultRows(string $owner, int $recordId, int $count): void
    {
        $rows = array_map(fn (int $row): array => [
            'row_no' => $row,
            'result_summary' => "Demo result {$row}: change applied as planned.",
            'performance_information' => "Demo: error rate 0 during monitoring window {$row}.",
            'result_status' => 'SUCCESS',
        ], range(1, $count));
        $this->results->update($this->actors[$owner], $recordId, $this->version($recordId), $rows);
        $this->tick();
    }

    /** Runs one workflow/lifecycle action at the next clock step, at the record's current version. */
    private function act(string $action, string $actor, int $recordId, ?string $reason = null, ?NscmfStatus $destination = null): void
    {
        $user = $this->actors[$actor];
        $version = $this->version($recordId);
        match ($action) {
            'submit' => $this->workflow->submit($user, $recordId, $version),
            'forward' => $this->workflow->forward($user, $recordId, $version, null),
            'approve' => $this->workflow->approve($user, $recordId, $version, 'Demo approval.'),
            'returnForRevision', 'reject', 'returnToReviewer', 'returnToRequester', 'rejectApproval' => $this->workflow->{$action}($user, $recordId, $version, (string) $reason),
            'cancel' => $this->lifecycle->cancel($user, $recordId, $version, $reason),
            'archive' => $this->lifecycle->archive($user, $recordId, $version, (string) $reason),
            'reopen' => $this->lifecycle->reopen($user, $recordId, $version, (string) $reason, $destination ?? NscmfStatus::REVISION_REQUIRED),
            default => throw new RuntimeException("Unknown demo action [{$action}]."),
        };
        $this->tick();
    }

    private function version(int $recordId): int
    {
        return ($this->records->find($recordId) ?? throw new RuntimeException('Demo record vanished.'))->record_version;
    }

    private function tick(): void
    {
        $this->clock = isset($this->clock) ? $this->clock->addHour() : CarbonImmutable::now();
        Carbon::setTestNow($this->clock);
        CarbonImmutable::setTestNow($this->clock);
    }

    /** @return array<string, mixed> Synthetic, documentation-range values only (17 §30, §52). */
    private static function activation(string $subtype, int $seed): array
    {
        $existing = ['service_context' => 'EXISTING', 'service_id' => "DEMO-SVC-{$seed}0", 'service_status' => 'ACTIVATED',
            'service_description' => 'Demo dedicated internet 50 Mbps', 'service_location' => "Demo Street {$seed}, Example City"];
        $new = ['service_context' => 'NEW', 'service_id' => "DEMO-SVC-{$seed}1", 'service_status' => 'ACTIVATED',
            'service_description' => 'Demo dedicated internet 100 Mbps', 'service_location' => "Demo Street {$seed}, Example City"];
        $references = [
            [['reference_type' => 'IWO', 'specification' => "DEMO-IWO-{$seed}"]],
            [['reference_type' => 'VELOSHIP', 'specification' => null]],
            [['reference_type' => 'TICKET', 'specification' => "DEMO-TICKET-{$seed}"]],
            [['reference_type' => 'OTHER', 'specification' => 'Demo internal memo']],
        ][$seed % 4];

        return [
            'customer_name' => "Demo Customer {$seed}",
            'contact_name' => "Demo Contact {$seed}",
            'installation_rfs_date' => $subtype === 'DEACTIVATION' ? null : '2026-10-'.str_pad((string) $seed, 2, '0', STR_PAD_LEFT),
            'lan_ip_allocation' => '198.51.100.0/29',
            'wan_ip' => "192.0.2.{$seed}0",
            'gateway' => '192.0.2.1',
            'pop' => 'Demo POP Example City',
            'regional' => 'Demo Region',
            'bandwidth_international_mbps' => 50 + $seed,
            'primary_dns' => '192.0.2.53',
            'domain_name_1' => "demo{$seed}.example.com",
            'mx_primary' => 'mail.example.com',
            'migrate_domain' => $seed % 2 === 0,
            'references' => $references,
            'service_blocks' => match ($subtype) {
                'ACTIVATION' => [$new],
                'DEACTIVATION' => [$existing],
                default => [$existing, $new],
            },
            'sla_items' => [['row_no' => 1, 'requirement_text' => 'Demo uptime target per contract']],
            'virtual_connections' => $seed % 3 === 0 ? [['row_no' => 1, 'bandwidth_mbps' => 20]] : [],
            'priority_destinations' => $seed % 3 === 1 ? [['row_no' => 1, 'destination' => 'Demo CDN example.net']] : [],
        ];
    }

    /**
     * @param  list<string>  $impacts
     * @return array<string, mixed>
     */
    private static function change(string $subtype, int $seed, array $impacts): array
    {
        return [
            'maintenance_purpose' => "Demo maintenance {$seed}: replace an optical module.",
            'target_execution_date' => '2026-10-'.str_pad((string) ($seed - 10), 2, '0', STR_PAD_LEFT),
            'monitoring_period_value' => 3,
            'monitoring_period_unit' => 'DAY',
            'rollback_scenario' => 'Demo: restore the previous module and saved configuration.',
            'announcement_timing' => $subtype === 'EMERGENCY' ? 'TWO_DAYS_BEFORE_EMERGENCY' : 'ONE_WEEK_BEFORE',
            'facing_challenges' => $subtype === 'MAINTENANCE' ? [] : [['row_no' => 1, 'challenge_text' => 'Demo: limited maintenance window.']],
            'identified_problems' => [['row_no' => 1, 'problem_text' => 'Demo: rising error rate on the uplink.']],
            'service_impacts' => array_map(fn (string $code): array => [
                'impact_code' => $code,
                'other_description' => $code === 'OTHER' ? 'Demo enterprise customers in Example Region' : null,
            ], $impacts),
            'improvement_items' => [['row_no' => 1, 'plan_text' => 'Demo: replace the module and monitor.', 'target_kpi' => 'Demo: zero errors for 72 hours.']],
        ];
    }
}
