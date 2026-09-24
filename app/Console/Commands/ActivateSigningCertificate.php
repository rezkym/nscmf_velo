<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Export\SigningCertificateService;
use Illuminate\Console\Command;
use RuntimeException;

/** Operator provisioning/rotation of the Organization signing certificate (BE-116, BE-118). */
final class ActivateSigningCertificate extends Command
{
    protected $signature = 'nscmf:signing:activate {--generate : Create a new self-signed Organization key pair first} {--label= : Certificate label}';

    protected $description = 'Register the configured PKCS#12 signing certificate as the active Organization signer';

    public function handle(SigningCertificateService $certificates): int
    {
        $path = config()->string('nscmf.signing.p12_path');
        $passphrase = config()->string('nscmf.signing.p12_passphrase');
        $organization = config()->string('nscmf.signing.organization');
        $label = $this->option('label');

        try {
            if ($this->option('generate')) {
                $certificates->generate($organization, $path, $passphrase);
            }
            $fingerprint = $certificates->activate($path, $passphrase, is_string($label) && $label !== '' ? $label : $organization);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Active signing certificate: {$fingerprint}");

        return self::SUCCESS;
    }
}
