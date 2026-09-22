<?php

declare(strict_types=1);

namespace App\Domain\Nscmf\Enums;

/**
 * Change Service Impact business form values (12 §28.2). They are never permissions,
 * Team names or authorization scopes.
 */
enum ServiceImpactCode: string
{
    case NOC15 = 'NOC15';
    case NOC23 = 'NOC23';
    case NOC361 = 'NOC361';
    case REGIONAL = 'REGIONAL';
    case POP = 'POP';
    case CUSTOMER = 'CUSTOMER';
    case OTHER = 'OTHER';
}
