<?php

declare(strict_types=1);

namespace App\Domain\Attachment;

/**
 * A whole-file scanner answer. Anything that is not an explicit CLEAN keeps the file unusable
 * (11A §18); scanner errors, timeouts and unavailability surface as ScannerUnavailable.
 */
enum ScanVerdict: string
{
    case CLEAN = 'CLEAN';
    case INFECTED = 'INFECTED';
}
