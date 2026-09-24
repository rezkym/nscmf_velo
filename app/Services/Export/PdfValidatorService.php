<?php

declare(strict_types=1);

namespace App\Services\Export;

use App\Domain\Attachment\ScanVerdict;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Malware\MalwareScanner;
use App\Infrastructure\Malware\ScannerUnavailable;
use App\Infrastructure\Pdf\PdfSignatureInspector;
use App\Infrastructure\Storage\RuntimeWorkspace;
use App\Repositories\Contracts\Export\ExportRepository;
use App\Repositories\Contracts\Export\SigningCertificateRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use Illuminate\Http\UploadedFile;

/**
 * The public PDF validator (12 §72–75, 20 §21): size/type gate → private temp → whole-file
 * scan → cryptographic signature → exact-byte SHA-256 issuance lookup → currentness, with
 * minimum disclosure and the temp workspace always removed.
 */
final readonly class PdfValidatorService
{
    public const string VALID_CURRENT = 'VALID_CURRENT';

    public const string VALID_SUPERSEDED = 'VALID_SUPERSEDED';

    public const string INVALID_MODIFIED = 'INVALID_MODIFIED';

    public const string UNKNOWN = 'UNKNOWN';

    public function __construct(
        private ExportRepository $exports,
        private SigningCertificateRepository $certificates,
        private NscmfRepository $records,
        private PdfSignatureInspector $inspector,
        private MalwareScanner $scanner,
        private RuntimeWorkspace $workspace,
    ) {}

    /** @return array<string, mixed> */
    public function verify(UploadedFile $file): array
    {
        $size = (int) $file->getSize();
        if ($size > config()->integer('nscmf.attachments.max_bytes')) {
            throw new DomainRuleException('VALIDATOR_FILE_TOO_LARGE', 'The PDF may be at most 20,000,000 bytes.', 422);
        }
        $bytes = $size === 0 ? '' : (string) file_get_contents($file->getRealPath());
        if ($bytes === '' || strtolower($file->getClientOriginalExtension()) !== 'pdf' || ! str_starts_with($bytes, '%PDF-')) {
            throw new DomainRuleException('VALIDATOR_FILE_INVALID', 'Upload one PDF file.', 422);
        }

        $directory = $this->workspace->create('validator');
        try {
            $path = $directory.'/upload.pdf';
            file_put_contents($path, $bytes);
            $this->scan($path);

            return $this->classify($bytes, $directory);
        } finally {
            $this->workspace->remove($directory);
        }
    }

    private function scan(string $path): void
    {
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new DomainRuleException('VALIDATOR_SCAN_FAILED', 'The PDF could not be checked right now. Try again later.', 503);
        }
        try {
            $verdict = $this->scanner->scan($stream);
        } catch (ScannerUnavailable) {
            throw new DomainRuleException('VALIDATOR_SCAN_FAILED', 'The PDF could not be checked right now. Try again later.', 503);
        } finally {
            fclose($stream);
        }
        if ($verdict !== ScanVerdict::CLEAN) {
            throw new DomainRuleException('VALIDATOR_FILE_INVALID', 'This file cannot be verified.', 422);
        }
    }

    /** @return array<string, mixed> */
    private function classify(string $bytes, string $directory): array
    {
        $inspection = $this->inspector->inspect($bytes, $directory);
        $certificate = $inspection['signer_fingerprint'] === null ? null : $this->certificates->byFingerprint($inspection['signer_fingerprint']);
        if (! $inspection['signed'] || $certificate === null) {
            return ['result' => self::UNKNOWN];
        }
        if (! $inspection['intact'] || ! $inspection['covers_whole_file']) {
            return ['result' => self::INVALID_MODIFIED];
        }

        $issuance = $this->exports->issuanceBySha(hash('sha256', $bytes));
        if ($issuance === null || $issuance->signing_certificate_id !== $certificate->id) {
            return ['result' => self::UNKNOWN];
        }

        // Currentness follows the record's authoritative iteration, never a flag in the file.
        $record = $this->records->find($issuance->nscmf_record_id);
        $current = $record !== null
            && $record->business_status === NscmfStatus::APPROVED
            && $record->current_workflow_iteration_id === $issuance->workflow_iteration_id;

        return [
            'result' => $current ? self::VALID_CURRENT : self::VALID_SUPERSEDED,
            'request_no' => $issuance->snapshot->recordField('request_no'),
            'family' => $issuance->snapshot->recordField('family'),
            'issued_at' => $issuance->issued_at->toIso8601String(),
            'issuer' => self::organization(is_string($certificate->public_certificate_material ?? null) ? $certificate->public_certificate_material : ''),
        ];
    }

    private static function organization(string $pem): ?string
    {
        $parsed = $pem === '' ? false : openssl_x509_parse($pem);
        $organization = is_array($parsed) && is_array($parsed['subject'] ?? null) ? ($parsed['subject']['O'] ?? null) : null;

        return is_string($organization) ? $organization : null;
    }
}
