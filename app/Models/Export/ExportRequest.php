<?php

declare(strict_types=1);

namespace App\Models\Export;

use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $nscmf_record_id
 * @property int $requested_by_user_id
 * @property int|null $export_batch_id
 * @property ExportFormat $format
 * @property ExportStatus $status
 * @property CarbonImmutable $requested_at
 * @property CarbonImmutable|null $started_at
 * @property CarbonImmutable|null $ready_at
 * @property CarbonImmutable|null $failed_at
 * @property CarbonImmutable|null $expires_at
 * @property string|null $failure_code
 * @property string|null $failure_summary
 * @property-read ExportSnapshot|null $snapshot
 * @property-read ExportArtifact|null $artifact
 * @property-read PdfIssuance|null $issuance
 */
class ExportRequest extends Model
{
    public $timestamps = false;

    protected $table = 'nscmf_export_requests';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return [
            'format' => ExportFormat::class,
            'status' => ExportStatus::class,
            'requested_at' => 'immutable_datetime',
            'started_at' => 'immutable_datetime',
            'ready_at' => 'immutable_datetime',
            'failed_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
        ];
    }

    /** @return HasOne<ExportSnapshot, $this> */
    public function snapshot(): HasOne
    {
        return $this->hasOne(ExportSnapshot::class, 'export_request_id');
    }

    /** @return HasOne<ExportArtifact, $this> */
    public function artifact(): HasOne
    {
        return $this->hasOne(ExportArtifact::class, 'export_request_id');
    }

    /** @return HasOne<PdfIssuance, $this> */
    public function issuance(): HasOne
    {
        return $this->hasOne(PdfIssuance::class, 'export_request_id');
    }
}
