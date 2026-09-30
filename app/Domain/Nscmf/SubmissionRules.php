<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use Carbon\CarbonImmutable;

/**
 * FIRST_SUBMIT / RESUBMIT validation (06 §5–7, §21, §29–41). Only the request date is required;
 * every other form field is optional, and a provided value must still pass its format rule (G24).
 * Returns errors keyed by the wire path the client uses, so each message lands on the control that
 * owns it. Draft persistence never applies these rules (06 §5).
 */
final class SubmissionRules
{
    /**
     * The target date must be today or later on first Submit, and at Resubmit when it was changed
     * during revision; an unchanged accepted past date may stay (06 §40).
     *
     * @param  array<string, mixed>  $state  canonical family state
     * @return array<string, list<string>>
     */
    public static function errors(
        NscmfFamily $family,
        array $state,
        ?string $requestDate,
        bool $isFirstSubmit,
        bool $targetDateChangedInRevision = false,
    ): array {
        return [
            ...self::headerErrors($requestDate, $isFirstSubmit),
            ...($family === NscmfFamily::ACTIVATION
                ? self::activationErrors($state)
                : self::changeErrors($state, $isFirstSubmit || $targetDateChangedInRevision)),
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
    private static function activationErrors(array $state): array
    {
        $errors = [];
        $root = 'activation';

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

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $state
     * @return array<string, list<string>>
     */
    private static function changeErrors(array $state, bool $targetMustNotBePast): array
    {
        $targetDate = $state['target_execution_date'] ?? null;
        if ($targetMustNotBePast && is_string($targetDate) && CarbonImmutable::parse($targetDate)->isBefore(CarbonImmutable::now()->startOfDay())) {
            return ['change.target_execution_date' => ['The target execution date must be today or later.']];
        }

        return [];
    }
}
