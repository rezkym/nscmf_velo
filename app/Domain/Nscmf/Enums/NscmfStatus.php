<?php

declare(strict_types=1);

namespace App\Domain\Nscmf\Enums;

/**
 * The seven canonical NSCMF business states (05 §4). Archive, upload, export and security
 * states are separate technical namespaces and never appear here.
 */
enum NscmfStatus: string
{
    case DRAFT = 'DRAFT';
    case PENDING_REVIEW = 'PENDING_REVIEW';
    case REVISION_REQUIRED = 'REVISION_REQUIRED';
    case PENDING_APPROVAL = 'PENDING_APPROVAL';
    case REJECTED = 'REJECTED';
    case APPROVED = 'APPROVED';
    case CANCELLED = 'CANCELLED';

    /** Never submitted: visible to its owner only (12 §17.1). CANCELLED only arises before Submit. */
    public function isNeverSubmitted(): bool
    {
        return $this === self::DRAFT || $this === self::CANCELLED;
    }

    /** General Requester editing and Save Draft (05 §30). */
    public function allowsDraftEdit(): bool
    {
        return $this === self::DRAFT || $this === self::REVISION_REQUIRED;
    }
}
