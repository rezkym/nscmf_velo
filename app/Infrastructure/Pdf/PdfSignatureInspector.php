<?php

declare(strict_types=1);

namespace App\Infrastructure\Pdf;

/**
 * Reads a PDF's last `adbe.pkcs7.detached` signature and checks it cryptographically with
 * OpenSSL (BE-120). Trust is not decided here: the caller matches the signer certificate
 * against registered Organization material.
 *
 * @phpstan-type Inspection array{signed: bool, intact: bool, signer_fingerprint: string|null, covers_whole_file: bool}
 */
final class PdfSignatureInspector
{
    /**
     * @return Inspection
     */
    public function inspect(string $pdf, string $workspace): array
    {
        $none = ['signed' => false, 'intact' => false, 'signer_fingerprint' => null, 'covers_whole_file' => false];
        if (preg_match_all('#/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]#', $pdf, $ranges, PREG_SET_ORDER) === 0) {
            return $none;
        }
        $last = $ranges[count($ranges) - 1];
        [$start1, $length1, $start2, $length2] = [(int) $last[1], (int) $last[2], (int) $last[3], (int) $last[4]];
        $hex = substr($pdf, $start1 + $length1, $start2 - $start1 - $length1);
        if ($start1 !== 0 || ! preg_match('#^<([0-9A-Fa-f]+)>$#', trim($hex), $contents)) {
            return ['signed' => true, 'intact' => false, 'signer_fingerprint' => null, 'covers_whole_file' => false];
        }

        $signature = self::derBlob((string) hex2bin(strlen($contents[1]) % 2 === 0 ? $contents[1] : $contents[1].'0'));
        if ($signature === null) {
            return ['signed' => true, 'intact' => false, 'signer_fingerprint' => null, 'covers_whole_file' => false];
        }
        $signedBytes = substr($pdf, 0, $length1).substr($pdf, $start2, $length2);
        $files = [
            'content' => $workspace.'/content.bin',
            'signature' => $workspace.'/signature.der',
            'signers' => $workspace.'/signers.pem',
            'output' => $workspace.'/verified.bin',
        ];
        file_put_contents($files['content'], $signedBytes);
        file_put_contents($files['signature'], $signature);

        // NOVERIFY skips public-CA chain building only; the signature over the bytes is checked.
        $intact = openssl_cms_verify($files['content'], OPENSSL_CMS_BINARY | OPENSSL_CMS_NOVERIFY | OPENSSL_CMS_DETACHED,
            $files['signers'], [], null, $files['output'], null, $files['signature'], OPENSSL_ENCODING_DER) === true;
        $signerPem = is_file($files['signers']) ? (string) file_get_contents($files['signers']) : '';
        if (! $intact && $signerPem === '') {
            // A broken signature still names its signer; read it without trusting the bytes.
            openssl_cms_verify($files['content'], OPENSSL_CMS_BINARY | OPENSSL_CMS_NOVERIFY | OPENSSL_CMS_NOSIGS | OPENSSL_CMS_DETACHED,
                $files['signers'], [], null, $files['output'], null, $files['signature'], OPENSSL_ENCODING_DER);
            $signerPem = is_file($files['signers']) ? (string) file_get_contents($files['signers']) : '';
        }

        return [
            'signed' => true,
            'intact' => $intact,
            'signer_fingerprint' => $signerPem === '' ? null : SappPdfSigner::fingerprint($signerPem),
            'covers_whole_file' => $start2 + $length2 === strlen($pdf),
        ];
    }

    /** The /Contents placeholder is zero-padded after the DER blob; its ASN.1 header gives the exact length. */
    private static function derBlob(string $bytes): ?string
    {
        if (strlen($bytes) < 2 || $bytes[0] !== "\x30") {
            return null;
        }
        $first = ord($bytes[1]);
        if ($first < 0x80) {
            return substr($bytes, 0, 2 + $first);
        }
        $octets = $first & 0x7F;
        $length = 0;
        for ($index = 0; $index < $octets; $index++) {
            $length = ($length << 8) | ord($bytes[2 + $index] ?? "\0");
        }
        $total = 2 + $octets + $length;

        return $total <= strlen($bytes) ? substr($bytes, 0, $total) : null;
    }
}
