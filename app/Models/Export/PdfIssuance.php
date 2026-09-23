<?php

declare(strict_types=1);

namespace App\Models\Export;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable evidence of one signed Approved PDF (11 §48); outlives the 168h binary.
 *
 * @property int $id
 * @property int $export_request_id
 * @property int $export_artifact_id
 * @property int $nscmf_record_id
 * @property int $export_snapshot_id
 * @property int $workflow_iteration_id
 * @property int $signing_certificate_id
 * @property string $final_pdf_sha256
 * @property CarbonImmutable $issued_at
 * @property-read ExportSnapshot $snapshot
 */
class PdfIssuance extends Model
{
    public $timestamps = false;

    protected $table = 'nscmf_pdf_issuances';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new \LogicException('PDF issuances are immutable.'));
        static::deleting(fn (): never => throw new \LogicException('PDF issuances are never deleted.'));
    }

    protected function casts(): array
    {
        return ['issued_at' => 'immutable_datetime'];
    }

    /** @return BelongsTo<ExportSnapshot, $this> */
    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(ExportSnapshot::class, 'export_snapshot_id');
    }
}
