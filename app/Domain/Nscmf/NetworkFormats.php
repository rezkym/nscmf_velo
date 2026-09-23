<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

/**
 * Format checks for the optional NOC/DNS fields at submission time (06 §29, §31). They are
 * deliberately permissive about *which* addresses are used and strict only about shape.
 */
final class NetworkFormats
{
    public static function isIp(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /** A single address or a CIDR block. */
    public static function isIpOrCidr(string $value): bool
    {
        if (self::isIp($value)) {
            return true;
        }

        [$address, $prefix] = array_pad(explode('/', $value, 2), 2, null);

        if ($prefix === null || ! is_string($address) || ! ctype_digit($prefix)) {
            return false;
        }

        $max = filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false ? 32 : 128;

        return self::isIp($address) && (int) $prefix >= 0 && (int) $prefix <= $max;
    }

    /** One entry of a LAN allocation: address, CIDR block or start–end range (06 §29). */
    public static function isAllocationEntry(string $value): bool
    {
        if (self::isIpOrCidr($value)) {
            return true;
        }

        $range = explode('-', $value);

        return count($range) === 2 && self::isIp(trim($range[0])) && self::isIp(trim($range[1]));
    }

    /**
     * @return list<string> the entries that are not well formed
     */
    public static function invalidAllocationEntries(string $value): array
    {
        $invalid = [];

        foreach (preg_split('/[\r\n,]+/', $value) ?: [] as $entry) {
            $entry = trim($entry);

            if ($entry !== '' && ! self::isAllocationEntry($entry)) {
                $invalid[] = $entry;
            }
        }

        return $invalid;
    }

    public static function isFqdn(string $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) !== false && str_contains($value, '.');
    }

    /** An MX value: an FQDN, optionally preceded by a numeric priority (06 §31). */
    public static function isMailExchanger(string $value): bool
    {
        $parts = preg_split('/\s+/', trim($value)) ?: [];

        if (count($parts) === 2) {
            return ctype_digit($parts[0]) && self::isFqdn($parts[1]);
        }

        return count($parts) === 1 && self::isFqdn($parts[0]);
    }
}
