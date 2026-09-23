<?php

declare(strict_types=1);

namespace App\Models\Attachment;

use App\Domain\Attachment\UploadStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A resumable upload's server-authoritative transport state (11A §23.1). Technical only.
 *
 * @property int $id
 * @property string $public_id
 * @property int $nscmf_record_id
 * @property int $initiated_by_user_id
 * @property string $original_filename
 * @property string $normalized_extension
 * @property string|null $client_declared_mime
 * @property int $expected_size_bytes
 * @property int $chunk_size_bytes
 * @property int $expected_chunk_count
 * @property string|null $client_fingerprint_sha256
 * @property UploadStatus $upload_status
 * @property CarbonImmutable $last_activity_at
 * @property CarbonImmutable $expires_at
 * @property string|null $assembly_storage_key
 * @property string|null $failure_code
 * @property int|null $attachment_id
 * @property-read Collection<int, UploadChunk> $chunks
 * @property-read Attachment|null $attachment
 */
class UploadSession extends Model
{
    protected $table = 'nscmf_attachment_upload_sessions';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return [
            'upload_status' => UploadStatus::class,
            'last_activity_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
        ];
    }

    /** @return HasMany<UploadChunk, $this> */
    public function chunks(): HasMany
    {
        return $this->hasMany(UploadChunk::class, 'upload_session_id')->orderBy('chunk_index');
    }

    /** @return BelongsTo<Attachment, $this> */
    public function attachment(): BelongsTo
    {
        return $this->belongsTo(Attachment::class);
    }

    /** Size of chunk $index: the fixed size, or the exact remainder for the last one (12 §54). */
    public function expectedChunkBytes(int $index): int
    {
        return $index < $this->expected_chunk_count
            ? $this->chunk_size_bytes
            : $this->expected_size_bytes - ($this->expected_chunk_count - 1) * $this->chunk_size_bytes;
    }
}
