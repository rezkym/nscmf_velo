<?php

declare(strict_types=1);

namespace App\Services\Export;

use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Infrastructure\Pdf\SappPdfSigner;
use App\Repositories\Contracts\Export\SigningCertificateRepository;
use App\Services\Audit\SecurityAuditService;
use RuntimeException;

/**
 * Organization signing-certificate provisioning and rotation (BE-116, BE-118). Only public
 * material reaches the database; the PKCS#12 container stays on private disk and its
 * passphrase only in the environment. A self-signed Organization certificate is acceptable
 * for the current MVP trust model (/ispdfvalid, no public CA).
 */
final readonly class SigningCertificateService
{
    public function __construct(
        private SigningCertificateRepository $certificates,
        private SecurityAuditService $securityAudit,
    ) {}

    /** Creates a new self-signed Organization key pair in the configured PKCS#12 container. */
    public function generate(string $organization, string $p12Path, string $passphrase): void
    {
        if ($passphrase === '') {
            throw new RuntimeException('Set NSCMF_SIGNING_P12_PASSPHRASE before generating a signing key.');
        }
        $key = openssl_pkey_new(['private_key_bits' => 3072, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        if ($key === false) {
            throw new RuntimeException('The signing key pair could not be generated.');
        }
        $csrKey = $key; // openssl_csr_new takes the key by reference
        $csr = openssl_csr_new(['organizationName' => $organization, 'commonName' => $organization.' NSCMF Signing'], $csrKey, ['digest_alg' => 'sha256']);
        $certificate = $csr instanceof \OpenSSLCertificateSigningRequest
            ? openssl_csr_sign($csr, null, $key, 3 * 365, ['digest_alg' => 'sha256'], random_int(1, PHP_INT_MAX))
            : false;
        $container = '';
        if ($certificate === false || ! openssl_pkcs12_export($certificate, $container, $key, $passphrase)) {
            throw new RuntimeException('The signing key pair could not be generated.');
        }

        $directory = dirname($p12Path);
        if (! is_dir($directory) && ! mkdir($directory, 0700, true)) {
            throw new RuntimeException('The signing key directory could not be created.');
        }
        if (file_put_contents($p12Path, $container) === false || ! chmod($p12Path, 0600)) {
            throw new RuntimeException('The signing key container could not be written.');
        }
    }

    /** Registers the container's public certificate as the single active one; the previous is retired. */
    public function activate(string $p12Path, string $passphrase, string $label): string
    {
        $container = @file_get_contents($p12Path);
        $credentials = [];
        if ($container === false || ! openssl_pkcs12_read($container, $credentials, $passphrase) || ! is_array($credentials) || ! is_string($credentials['cert'] ?? null)) {
            throw new RuntimeException('The signing key container cannot be opened with the configured passphrase.');
        }
        $pem = $credentials['cert'];
        $parsed = openssl_x509_parse($pem);
        if ($parsed === false) {
            throw new RuntimeException('The signing certificate is unreadable.');
        }
        $fingerprint = SappPdfSigner::fingerprint($pem);
        $subject = is_array($parsed['subject'] ?? null) ? $parsed['subject'] : [];

        $this->certificates->registerActive([
            'certificate_label' => $label,
            'fingerprint_sha256' => $fingerprint,
            'serial_number' => is_scalar($parsed['serialNumber'] ?? null) ? (string) $parsed['serialNumber'] : null,
            'subject_dn' => implode(', ', array_map(fn (string $k, mixed $v): string => $k.'='.(is_scalar($v) ? (string) $v : ''), array_keys($subject), $subject)),
            'valid_from' => is_int($parsed['validFrom_time_t'] ?? null) ? date('Y-m-d H:i:s', $parsed['validFrom_time_t']) : null,
            'valid_until' => is_int($parsed['validTo_time_t'] ?? null) ? date('Y-m-d H:i:s', $parsed['validTo_time_t']) : null,
            'material_format' => 'PEM',
            'public_certificate_material' => $pem,
        ]);
        $this->securityAudit->record(SecurityAuditEvent::SIGNING_CERTIFICATE_ACTIVATED, SecurityAuditOutcome::SUCCESS, metadata: ['fingerprint' => $fingerprint]);

        return $fingerprint;
    }
}
