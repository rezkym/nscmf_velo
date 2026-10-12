<?php

declare(strict_types=1);

namespace App\Models\Reports;

use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use App\Models\Export\TemplateVersion;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One requested Activity Log report file (11 §44A): its immutable snapshot, progress and private
 * artifact. The snapshot columns never change after creation.
 *
 * @property int $id
 * @property int $requested_by_user_id
 * @property ExportFormat $format
 * @property ExportStatus $status
 * @property int $progress_percent
 * @property int $template_version_id
 * @property string $snapshot_schema_version
 * @property array<mixed> $snapshot_json
 * @property string $snapshot_sha256
 * @property int $entry_count
 * @property CarbonImmutable $requested_at
 * @property CarbonImmutable|null $started_at
 * @property CarbonImmutable|null $ready_at
 * @property CarbonImmutable|null $failed_at
 * @property CarbonImmutable|null $expires_at
 * @property string|null $failure_code
 * @property string|null $failure_summary
 * @property string|null $private_object_key
 * @property string|null $mime_type
 * @property int|null $size_bytes
 * @property string|null $artifact_sha256
 * @property CarbonImmutable|null $binary_purged_at
 * @property-read TemplateVersion $templateVersion
 */
class ActivityLogExport extends Model
{
    public $timestamps = false;

    protected $table = 'nscmf_activity_log_exports';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return [
            'format' => ExportFormat::class,
            'status' => ExportStatus::class,
            'progress_percent' => 'integer',
            'snapshot_json' => 'array',
            'entry_count' => 'integer',
            'size_bytes' => 'integer',
            'requested_at' => 'immutable_datetime',
            'started_at' => 'immutable_datetime',
            'ready_at' => 'immutable_datetime',
            'failed_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'binary_purged_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<TemplateVersion, $this> */
    public function templateVersion(): BelongsTo
    {
        return $this->belongsTo(TemplateVersion::class, 'template_version_id');
    }
}
