<?php

declare(strict_types=1);

namespace App\Models\Attachment;

use App\Domain\Attachment\SecurityStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * A final attachment and its file-security state (11 §39). Only CLEAN is usable.
 *
 * @property int $id
 * @property int $nscmf_record_id
 * @property int $uploaded_by_user_id
 * @property string $original_filename
 * @property string $extension
 * @property string $detected_mime_type
 * @property int $size_bytes
 * @property string $sha256
 * @property string|null $quarantine_object_key
 * @property string|null $private_object_key
 * @property SecurityStatus $security_status
 * @property CarbonImmutable|null $scanned_at
 * @property string|null $scanner_engine
 * @property CarbonImmutable|null $removed_at
 * @property int|null $removed_by_user_id
 * @property CarbonImmutable $created_at
 */
class Attachment extends Model
{
    protected $table = 'nscmf_attachments';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return [
            'security_status' => SecurityStatus::class,
            'scanned_at' => 'immutable_datetime',
            'removed_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
        ];
    }

    public function isDownloadable(): bool
    {
        return $this->security_status === SecurityStatus::CLEAN && $this->removed_at === null && $this->private_object_key !== null;
    }
}
