<?php

declare(strict_types=1);

namespace App\Models\Export;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $export_request_id
 * @property string|null $private_object_key
 * @property string $mime_type
 * @property int $size_bytes
 * @property string $artifact_sha256
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $binary_purged_at
 */
class ExportArtifact extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'nscmf_export_artifacts';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime', 'expires_at' => 'immutable_datetime', 'binary_purged_at' => 'immutable_datetime'];
    }
}
