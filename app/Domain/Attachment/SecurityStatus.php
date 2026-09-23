<?php

declare(strict_types=1);

namespace App\Domain\Attachment;

/** Attachment file-security state (11 §39); never an NSCMF business state. */
enum SecurityStatus: string
{
    case PENDING = 'PENDING';
    case CLEAN = 'CLEAN';
    case INFECTED = 'INFECTED';
    case FAILED = 'FAILED';
}
