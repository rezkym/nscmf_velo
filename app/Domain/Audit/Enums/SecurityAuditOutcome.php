<?php

declare(strict_types=1);

namespace App\Domain\Audit\Enums;

enum SecurityAuditOutcome: string
{
    case SUCCESS = 'SUCCESS';
    case FAILURE = 'FAILURE';
    case DENIED = 'DENIED';
    case ERROR = 'ERROR';
}
