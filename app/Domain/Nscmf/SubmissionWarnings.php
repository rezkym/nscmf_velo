<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfSubtype;

/**
 * Non-blocking warnings (06 §43–44). They never block Save or Submit and never describe a
 * security failure (12 §8).
 */
final class SubmissionWarnings
{
    /**
     * @param  array<string, mixed>  $state  canonical family state
     * @return list<string>
     */
    public static function for(NscmfFamily $family, NscmfSubtype $subtype, array $state, int $cleanAttachments): array
    {
        if ($family !== NscmfFamily::CHANGE) {
            return [];
        }

        $warnings = [];
        $timing = $state['announcement_timing'] ?? null;

        if ($subtype === NscmfSubtype::EMERGENCY && $timing !== null && $timing !== 'TWO_DAYS_BEFORE_EMERGENCY') {
            $warnings[] = 'Emergency changes are normally announced 2 days before (emergency).';
        }

        if ($subtype !== NscmfSubtype::EMERGENCY && $timing === 'TWO_DAYS_BEFORE_EMERGENCY') {
            $warnings[] = 'The 2-day emergency announcement is intended for Emergency changes.';
        }

        if (in_array($subtype, [NscmfSubtype::UPGRADE, NscmfSubtype::EMERGENCY], true) && $cleanAttachments === 0) {
            $warnings[] = 'No attachment is included. Attachments are optional, but Upgrade and Emergency changes usually carry one.';
        }

        return $warnings;
    }
}
