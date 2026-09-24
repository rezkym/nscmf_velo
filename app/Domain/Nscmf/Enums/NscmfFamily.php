<?php

declare(strict_types=1);

namespace App\Domain\Nscmf\Enums;

/** The two form families (06 §15); family is immutable after creation. */
enum NscmfFamily: string
{
    case ACTIVATION = 'ACTIVATION';
    case CHANGE = 'CHANGE';

    /**
     * @return list<NscmfSubtype>
     */
    public function subtypes(): array
    {
        return match ($this) {
            self::ACTIVATION => [NscmfSubtype::ACTIVATION, NscmfSubtype::UPGRADE_DOWNGRADE, NscmfSubtype::DEACTIVATION],
            self::CHANGE => [NscmfSubtype::MAINTENANCE, NscmfSubtype::UPGRADE, NscmfSubtype::EMERGENCY],
        };
    }

    public function allows(NscmfSubtype $subtype): bool
    {
        return in_array($subtype, $this->subtypes(), true);
    }

    /** The Draft payload key carrying this family's fields (12 §26). */
    public function payloadKey(): string
    {
        return strtolower($this->value);
    }
}
