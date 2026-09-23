<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domain\Attachment\ScanVerdict;
use App\Infrastructure\Malware\MalwareScanner;
use App\Infrastructure\Malware\ScannerUnavailable;

/** Isolated-test scanner (BE-097): real clamd evidence lives in tests/Integration. */
final class FakeScanner implements MalwareScanner
{
    public int $scanned = 0;

    /** @param ScanVerdict|null $verdict null simulates an unavailable scanner */
    public function __construct(private readonly ?ScanVerdict $verdict = ScanVerdict::CLEAN) {}

    public function scan(mixed $stream): ScanVerdict
    {
        $this->scanned++;
        stream_get_contents($stream);

        return $this->verdict ?? throw new ScannerUnavailable('Scanner offline.');
    }

    public function engine(): string
    {
        return 'FakeScanner';
    }
}
