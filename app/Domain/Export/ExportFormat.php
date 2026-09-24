<?php

declare(strict_types=1);

namespace App\Domain\Export;

/** Export formats (12 §64). */
enum ExportFormat: string
{
    case XLSX = 'XLSX';
    case PDF = 'PDF';

    public function mimeType(): string
    {
        return match ($this) {
            self::XLSX => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            self::PDF => 'application/pdf',
        };
    }
}
