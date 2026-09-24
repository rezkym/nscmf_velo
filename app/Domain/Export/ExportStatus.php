<?php

declare(strict_types=1);

namespace App\Domain\Export;

/** Export technical state (12 §66); never an NSCMF business state. */
enum ExportStatus: string
{
    case QUEUED = 'QUEUED';
    case PROCESSING = 'PROCESSING';
    case READY = 'READY';
    case FAILED = 'FAILED';
    case EXPIRED = 'EXPIRED';
}
