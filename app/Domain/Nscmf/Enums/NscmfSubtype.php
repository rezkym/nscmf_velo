<?php

declare(strict_types=1);

namespace App\Domain\Nscmf\Enums;

/** Family-scoped subtypes (06 §16). The owning family is decided by NscmfFamily. */
enum NscmfSubtype: string
{
    case ACTIVATION = 'ACTIVATION';
    case UPGRADE_DOWNGRADE = 'UPGRADE_DOWNGRADE';
    case DEACTIVATION = 'DEACTIVATION';
    case MAINTENANCE = 'MAINTENANCE';
    case UPGRADE = 'UPGRADE';
    case EMERGENCY = 'EMERGENCY';
}
