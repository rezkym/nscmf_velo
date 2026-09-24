<?php

declare(strict_types=1);

namespace App\Infrastructure\Pdf;

/**
 * Organization cryptographic signing of Approved PDFs (10 §signing, DG-02). The signer is the
 * System/Organization, never the human Approver. Failure throws; there is no unsigned fallback.
 */
interface PdfSigner
{
    public function isReady(): bool;

    /** SHA-256 fingerprint of the certificate that signs, for issuance evidence. */
    public function certificateFingerprint(): string;

    /**
     * Signs $pdfPath into $signedPath.
     *
     * @throws SigningFailed
     */
    public function sign(string $pdfPath, string $signedPath): void;
}
