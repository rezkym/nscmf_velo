<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Export;

use App\Repositories\Contracts\Export\SigningCertificateRepository;
use Illuminate\Support\Facades\DB;

final class EloquentSigningCertificateRepository implements SigningCertificateRepository
{
    public function hasActiveCertificate(): bool
    {
        return DB::table('nscmf_signing_certificates')->where('is_active', true)->whereNull('retired_at')->exists();
    }
}
