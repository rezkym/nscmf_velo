<?php

declare(strict_types=1);

namespace App\Domain\Nscmf\Enums;

/** Request number mode chosen at creation (06 §17). */
enum NumberingMode: string
{
    case AUTOMATIC = 'AUTOMATIC';
    case MANUAL = 'MANUAL';
}
