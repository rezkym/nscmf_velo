<?php

declare(strict_types=1);

namespace App\Infrastructure\Pdf;

use App\Repositories\Contracts\Export\SigningCertificateRepository;
use ddn\sapp\PDFDoc;

/**
 * Organization signing with ddn/sapp (DG-02): PKCS#12 key container on private disk, passphrase
 * injected from the environment, SHA-256 `adbe.pkcs7.detached` signature. The key and passphrase
 * are never persisted or logged; only the public certificate is registered in the database.
 */
final readonly class SappPdfSigner implements PdfSigner
{
    public function __construct(
        private string $p12Path,
        private string $passphrase,
        private string $organization,
        private SigningCertificateRepository $certificates,
    ) {}

    public function isReady(): bool
    {
        $credentials = $this->credentials();

        return $credentials !== null && $this->certificates->activeByFingerprint(self::fingerprint($credentials['cert'])) !== null;
    }

    public function certificateFingerprint(): string
    {
        $credentials = $this->credentials() ?? throw new SigningFailed('The signing key container is unavailable.');

        return self::fingerprint($credentials['cert']);
    }

    public function sign(string $pdfPath, string $signedPath): void
    {
        $credentials = $this->credentials();
        $content = @file_get_contents($pdfPath);
        if ($credentials === null || $content === false) {
            throw new SigningFailed('The signing key container or the PDF is unavailable.');
        }

        $document = PDFDoc::from_string($content);
        if (! $document instanceof PDFDoc
            || ! self::succeeded($document->set_signature_certificate(['cert' => $credentials['cert'], 'pkey' => $credentials['pkey'], 'extracerts' => $credentials['extracerts'] ?? null]))) {
            throw new SigningFailed('The PDF could not be prepared for signing.');
        }
        $document->set_metadata_props($this->organization, 'Approved NSCMF', null, null);

        $signed = $document->to_pdf_file_s();
        if (! is_string($signed) || $signed === '' || @file_put_contents($signedPath, $signed) === false) {
            throw new SigningFailed('The PDF could not be signed.');
        }
    }

    /** sapp signals failure with `false` behind an imprecise docblock return type. */
    private static function succeeded(mixed $result): bool
    {
        return $result === true;
    }

    public static function fingerprint(string $certificatePem): string
    {
        $fingerprint = openssl_x509_fingerprint($certificatePem, 'sha256');

        return is_string($fingerprint) ? strtolower($fingerprint) : '';
    }

    /**
     * @return array{cert: string, pkey: string, extracerts?: mixed}|null
     */
    private function credentials(): ?array
    {
        if ($this->p12Path === '' || ! is_readable($this->p12Path)) {
            return null;
        }
        $container = @file_get_contents($this->p12Path);
        $credentials = [];
        if ($container === false || ! openssl_pkcs12_read($container, $credentials, $this->passphrase) || ! is_array($credentials)) {
            return null;
        }
        $cert = $credentials['cert'] ?? null;
        $pkey = $credentials['pkey'] ?? null;

        return is_string($cert) && is_string($pkey) ? ['cert' => $cert, 'pkey' => $pkey, 'extracerts' => $credentials['extracerts'] ?? null] : null;
    }
}
