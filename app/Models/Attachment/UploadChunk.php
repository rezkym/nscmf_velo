<?php

declare(strict_types=1);

namespace App\Models\Attachment;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * An accepted chunk; its row exists only after its bytes were durably written (11A §23.2).
 *
 * @property int $id
 * @property int $upload_session_id
 * @property int $chunk_index
 * @property int $size_bytes
 * @property string $storage_key
 * @property string|null $chunk_sha256
 * @property CarbonImmutable $accepted_at
 */
class UploadChunk extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'nscmf_attachment_upload_chunks';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return ['accepted_at' => 'immutable_datetime'];
    }
}
