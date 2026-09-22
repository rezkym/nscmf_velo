<?php

declare(strict_types=1);

namespace App\Domain\Audit\Enums;

/** Routine access evidence (11 §36); never a Business Timeline row. */
enum AccessAuditEvent: string
{
    case RECORD_VIEWED = 'RECORD_VIEWED';
    case ATTACHMENT_VIEWED = 'ATTACHMENT_VIEWED';
    case ATTACHMENT_DOWNLOADED = 'ATTACHMENT_DOWNLOADED';
    case EXPORT_REQUESTED = 'EXPORT_REQUESTED';
    case EXPORT_DOWNLOADED = 'EXPORT_DOWNLOADED';
    case PRIVILEGED_AUDIT_VIEWED = 'PRIVILEGED_AUDIT_VIEWED';
}
