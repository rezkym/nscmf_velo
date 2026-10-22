<?php

declare(strict_types=1);

namespace App\Domain\Export;

use App\Domain\Reports\ActivityLogMappingV1;

/** The workbook a registered template version is (11 §41, G26); one active version per kind. */
enum TemplateKind: string
{
    case NSCMF_FORM = 'NSCMF_FORM';
    case ACTIVITY_LOG = 'ACTIVITY_LOG';

    /** The operator spelling of `nscmf:template:register --kind`. */
    public static function fromOption(string $option): ?self
    {
        return match ($option) {
            'nscmf-form' => self::NSCMF_FORM,
            'activity-log' => self::ACTIVITY_LOG,
            default => null,
        };
    }

    /** The mapping a version of this kind is filled with; any other mapping is not ready. */
    public function mappingVersion(): string
    {
        return match ($this) {
            self::NSCMF_FORM => NscmfFormMappingV1::VERSION,
            self::ACTIVITY_LOG => ActivityLogMappingV1::VERSION,
        };
    }
}
