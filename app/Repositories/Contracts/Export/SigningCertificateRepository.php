<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Export;

interface SigningCertificateRepository
{
    /** Public verification material registered and active (11 §47); signing itself is Phase 8. */
    public function hasActiveCertificate(): bool;
}
