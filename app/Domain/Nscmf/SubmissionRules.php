<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use Carbon\CarbonImmutable;

/**
 * FIRST_SUBMIT / RESUBMIT validation (06 §6–7, §21–44). Returns errors keyed by the wire path the
 * client uses, so each message lands on the control that owns it. Draft persistence never applies
 * these rules (06 §5).
 */
final class SubmissionRules
{
    /** Service block requiredness per Activation subtype (06 §26). */
    private const array SERVICE_BLOCKS = [
        'ACTIVATION' => ['EXISTING' => false, 'NEW' => true],
        'UPGRADE_DOWNGRADE' => ['EXISTING' => true, 'NEW' => true],
        'DEACTIVATION' => ['EXISTING' => true, 'NEW' => false],
    ];

    /**
     * The target date must be today or later on first Submit, and at Resubmit when it was changed
     * during revision; an unchanged accepted past date may stay (06 §40).
     *
     * @param  array<string, mixed>  $state  canonical family state
     * @return array<string, list<string>>
     */
    public static function errors(
        NscmfFamily $family,
        NscmfSubtype $subtype,
        array $state,
        ?string $requestDate,
        bool $isFirstSubmit,
        bool $targetDateChangedInRevision = false,
    ): array {
        $errors = self::headerErrors($requestDate, $isFirstSubmit);

        return [
            ...$errors,
            ...($family === NscmfFamily::ACTIVATION
                ? self::activationErrors($subtype, $state)
                : self::changeErrors($subtype, $state, $isFirstSubmit || $targetDateChangedInRevision)),
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    private static function headerErrors(?string $requestDate, bool $isFirstSubmit): array
    {
        if ($requestDate === null) {
            return ['header.request_date' => ['The request date is required before submitting.']];
        }

        if ($isFirstSubmit && CarbonImmutable::parse($requestDate)->isAfter(CarbonImmutable::now()->startOfDay())) {
            return ['header.request_date' => ['The request date cannot be in the future for a first submission.']];
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, list<string>>
     */
    private static function activationErrors(NscmfSubtype $subtype, array $state): array
    {
        $errors = [];
        $root = 'activation';

        foreach (['customer_name' => 'The customer name is required.', 'contact_name' => 'The contact name is required.'] as $field => $message) {
            if (self::blank($state[$field] ?? null)) {
                $errors["{$root}.{$field}"] = [$message];
            }
        }

        if ($subtype !== NscmfSubtype::DEACTIVATION && self::blank($state['installation_rfs_date'] ?? null)) {
            $errors["{$root}.installation_rfs_date"] = ['The installation (RFS) date is required for this subtype.'];
        }

        $blocks = is_array($state['service_blocks'] ?? null) ? $state['service_blocks'] : [];
        $byContext = [];
        foreach ($blocks as $index => $block) {
            if (is_array($block) && is_string($block['service_context'] ?? null)) {
                $byContext[$block['service_context']] = ['index' => $index, 'block' => $block];
            }
        }

        foreach (self::SERVICE_BLOCKS[$subtype->value] ?? [] as $context => $required) {
            $entry = $byContext[$context] ?? null;

            if ($entry === null) {
                if ($required) {
                    $errors["{$root}.service_blocks"] = [self::blockMessage($context)];
                }

                continue;
            }

            // A started optional block must be completed too (06 §26).
            foreach (['service_id', 'service_status', 'service_description', 'service_location'] as $field) {
                if (self::blank($entry['block'][$field] ?? null)) {
                    $errors["{$root}.service_blocks.{$entry['index']}.{$field}"] = ['Complete every field of this service block before submitting.'];
                }
            }
        }

        foreach (is_array($state['references'] ?? null) ? $state['references'] : [] as $index => $reference) {
            if (is_array($reference) && ($reference['reference_type'] ?? null) === 'OTHER' && self::blank($reference['specification'] ?? null)) {
                $errors["{$root}.references.{$index}.specification"] = ['Describe the other reference.'];
            }
        }

        foreach (['wan_ip' => 'isIpOrCidr', 'gateway' => 'isIp', 'primary_dns' => 'isIp', 'secondary_dns' => 'isIp'] as $field => $check) {
            $value = $state[$field] ?? null;

            if (is_string($value) && $value !== '' && ! NetworkFormats::{$check}($value)) {
                $errors["{$root}.{$field}"] = [$check === 'isIp' ? 'Enter a valid IP address.' : 'Enter a valid IP address or CIDR block.'];
            }
        }

        $allocation = $state['lan_ip_allocation'] ?? null;
        if (is_string($allocation) && $allocation !== '' && NetworkFormats::invalidAllocationEntries($allocation) !== []) {
            $errors["{$root}.lan_ip_allocation"] = ['Every entry must be an IP address, a CIDR block or a start-end range.'];
        }

        foreach (['domain_name_1', 'domain_name_2'] as $field) {
            $value = $state[$field] ?? null;
            if (is_string($value) && $value !== '' && ! NetworkFormats::isFqdn($value)) {
                $errors["{$root}.{$field}"] = ['Enter a valid domain name.'];
            }
        }

        foreach (['mx_primary', 'mx_secondary'] as $field) {
            $value = $state[$field] ?? null;
            if (is_string($value) && $value !== '' && ! NetworkFormats::isMailExchanger($value)) {
                $errors["{$root}.{$field}"] = ['Enter a mail exchanger as a domain name, optionally with a numeric priority.'];
            }
        }

        if (($state['migrate_domain'] ?? false) === true && self::blank($state['domain_name_1'] ?? null)) {
            $errors["{$root}.domain_name_1"] = ['Domain migration needs domain name 1.'];
        }

        if (($state['migrate_hosting'] ?? false) === true) {
            foreach (['hosting_platform' => 'Hosting migration needs the hosting platform.', 'hosting_capacity_gb' => 'Hosting migration needs the hosting capacity.'] as $field => $message) {
                if (self::blank($state[$field] ?? null)) {
                    $errors["{$root}.{$field}"] = [$message];
                }
            }
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, list<string>>
     */
    private static function changeErrors(NscmfSubtype $subtype, array $state, bool $targetMustNotBePast): array
    {
        $errors = [];
        $root = 'change';

        if ($subtype === NscmfSubtype::MAINTENANCE && self::blank($state['maintenance_purpose'] ?? null)) {
            $errors["{$root}.maintenance_purpose"] = ['The maintenance purpose is required for a Maintenance change.'];
        }

        if (in_array($subtype, [NscmfSubtype::UPGRADE, NscmfSubtype::EMERGENCY], true)
            && self::startedRows($state['facing_challenges'] ?? null, ['challenge_text']) === 0) {
            $errors["{$root}.facing_challenges"] = ['Describe at least one facing challenge for this subtype.'];
        }

        if (self::startedRows($state['identified_problems'] ?? null, ['problem_text']) === 0) {
            $errors["{$root}.identified_problems"] = ['Describe at least one identified problem.'];
        }

        $impacts = is_array($state['service_impacts'] ?? null) ? $state['service_impacts'] : [];
        if ($impacts === []) {
            $errors["{$root}.service_impacts"] = ['Select at least one service impact.'];
        }
        foreach ($impacts as $index => $impact) {
            if (is_array($impact) && ($impact['impact_code'] ?? null) === 'OTHER' && self::blank($impact['other_description'] ?? null)) {
                $errors["{$root}.service_impacts.{$index}.other_description"] = ['Describe the other service impact.'];
            }
        }

        $items = is_array($state['improvement_items'] ?? null) ? $state['improvement_items'] : [];
        $complete = 0;
        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                continue;
            }
            $plan = ! self::blank($item['plan_text'] ?? null);
            $kpi = ! self::blank($item['target_kpi'] ?? null);

            if ($plan && $kpi) {
                $complete++;

                continue;
            }
            if ($plan) {
                $errors["{$root}.improvement_items.{$index}.target_kpi"] = ['Give the target KPI for this plan.'];
            }
            if ($kpi) {
                $errors["{$root}.improvement_items.{$index}.plan_text"] = ['Give the plan for this target KPI.'];
            }
        }
        if ($complete === 0) {
            $errors["{$root}.improvement_items"] = ['Give at least one complete plan and target KPI pair.'];
        }

        $targetDate = $state['target_execution_date'] ?? null;
        if (self::blank($targetDate)) {
            $errors["{$root}.target_execution_date"] = ['The target execution date is required.'];
        } elseif ($targetMustNotBePast && is_string($targetDate) && CarbonImmutable::parse($targetDate)->isBefore(CarbonImmutable::now()->startOfDay())) {
            $errors["{$root}.target_execution_date"] = ['The target execution date must be today or later.'];
        }

        if (self::blank($state['monitoring_period_value'] ?? null) || self::blank($state['monitoring_period_unit'] ?? null)) {
            $errors["{$root}.monitoring_period_value"] = ['Give the monitoring period amount and unit.'];
            $errors["{$root}.monitoring_period_unit"] = ['Give the monitoring period amount and unit.'];
        }

        if (self::blank($state['rollback_scenario'] ?? null)) {
            $errors["{$root}.rollback_scenario"] = ['The rollback scenario is required.'];
        }

        if (self::blank($state['announcement_timing'] ?? null)) {
            $errors["{$root}.announcement_timing"] = ['Choose exactly one maintenance announcement timing.'];
        }

        // Zero Result rows are allowed; a started row must be complete (06 §46).
        foreach (is_array($state['results'] ?? null) ? $state['results'] : [] as $index => $row) {
            if (! is_array($row)) {
                continue;
            }
            foreach (['result_summary', 'performance_information', 'result_status'] as $field) {
                if (self::blank($row[$field] ?? null)) {
                    $errors["{$root}.results.{$index}.{$field}"] = ['Complete every field of a started result row.'];
                }
            }
        }

        return $errors;
    }

    /**
     * @param  list<string>  $fields
     */
    private static function startedRows(mixed $rows, array $fields): int
    {
        $started = 0;

        foreach (is_array($rows) ? $rows : [] as $row) {
            foreach ($fields as $field) {
                if (is_array($row) && ! self::blank($row[$field] ?? null)) {
                    $started++;

                    break;
                }
            }
        }

        return $started;
    }

    private static function blank(mixed $value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '');
    }

    private static function blockMessage(string $context): string
    {
        return $context === 'NEW'
            ? 'The new service block is required for this subtype.'
            : 'The existing service block is required for this subtype.';
    }
}
