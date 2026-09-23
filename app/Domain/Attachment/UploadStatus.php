<?php

declare(strict_types=1);

namespace App\Domain\Attachment;

/** Upload transport state (11A §8); COMPLETED is not CLEAN and never a business state. */
enum UploadStatus: string
{
    case UPLOADING = 'UPLOADING';
    case ASSEMBLING = 'ASSEMBLING';
    case COMPLETED = 'COMPLETED';
    case EXPIRED = 'EXPIRED';
    case CANCELLED = 'CANCELLED';
    case FAILED = 'FAILED';
}
