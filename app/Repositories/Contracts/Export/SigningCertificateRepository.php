<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Export;

use stdClass;

interface SigningCertificateRepository
{
    /** Public verification material registered and active (11 §47). */
    public function hasActiveCertificate(): bool;

    /** Id of the active certificate with this SHA-256 fingerprint, if any. */
    public function activeByFingerprint(string $fingerprint): ?int;

    /** Any registered certificate, active or retired: history stays resolvable (BE-118). */
    public function byFingerprint(string $fingerprint): ?stdClass;

    public function find(int $id): ?stdClass;

    /**
     * Registers public material only and makes it the single active certificate; the previous
     * one is retired, never deleted.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function registerActive(array $attributes): int;
}
