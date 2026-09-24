<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Export;

use App\Repositories\Contracts\Export\SigningCertificateRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use stdClass;

final class EloquentSigningCertificateRepository implements SigningCertificateRepository
{
    public function hasActiveCertificate(): bool
    {
        return DB::table('nscmf_signing_certificates')->where('is_active', true)->whereNull('retired_at')->exists();
    }

    public function activeByFingerprint(string $fingerprint): ?int
    {
        $id = DB::table('nscmf_signing_certificates')->where('fingerprint_sha256', $fingerprint)
            ->where('is_active', true)->whereNull('retired_at')->value('id');

        return is_int($id) ? $id : null;
    }

    public function byFingerprint(string $fingerprint): ?stdClass
    {
        return DB::table('nscmf_signing_certificates')->where('fingerprint_sha256', $fingerprint)->first();
    }

    public function find(int $id): ?stdClass
    {
        return DB::table('nscmf_signing_certificates')->where('id', $id)->first();
    }

    public function registerActive(array $attributes): int
    {
        return DB::transaction(function () use ($attributes): int {
            $now = CarbonImmutable::now();
            DB::table('nscmf_signing_certificates')->where('is_active', true)
                ->where('fingerprint_sha256', '!=', $attributes['fingerprint_sha256'])
                ->update(['is_active' => false, 'retired_at' => $now]);

            $existing = DB::table('nscmf_signing_certificates')->where('fingerprint_sha256', $attributes['fingerprint_sha256'])->value('id');
            if (is_int($existing)) {
                DB::table('nscmf_signing_certificates')->where('id', $existing)->update(['is_active' => true, 'retired_at' => null]);

                return $existing;
            }

            return (int) DB::table('nscmf_signing_certificates')->insertGetId([...$attributes, 'is_active' => true, 'created_at' => $now]);
        });
    }
}
