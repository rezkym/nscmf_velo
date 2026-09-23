<?php

declare(strict_types=1);

namespace App\Models\Export;

use App\Domain\Export\ExportFormat;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $requested_by_user_id
 * @property ExportFormat $format
 * @property-read Collection<int, ExportRequest> $requests
 */
class ExportBatch extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'nscmf_export_batches';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['format' => ExportFormat::class];
    }

    /** @return HasMany<ExportRequest, $this> */
    public function requests(): HasMany
    {
        return $this->hasMany(ExportRequest::class, 'export_batch_id')->orderBy('id');
    }
}
