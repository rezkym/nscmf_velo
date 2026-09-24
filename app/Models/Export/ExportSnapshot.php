<?php

declare(strict_types=1);

namespace App\Models\Export;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The immutable export input bound at request time (11 §44).
 *
 * @property int $id
 * @property int $export_request_id
 * @property int $nscmf_record_id
 * @property int $record_version
 * @property int|null $workflow_iteration_id
 * @property int $template_version_id
 * @property string $snapshot_schema_version
 * @property array<string, mixed> $snapshot_json
 * @property string $snapshot_sha256
 * @property CarbonImmutable $created_at
 * @property-read TemplateVersion $templateVersion
 */
class ExportSnapshot extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'nscmf_export_snapshots';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new \LogicException('Export snapshots are immutable.'));
    }

    protected function casts(): array
    {
        return ['snapshot_json' => 'array', 'created_at' => 'immutable_datetime'];
    }

    /** One field of the snapshot's `record` header, e.g. its business status at request time. */
    public function recordField(string $key): mixed
    {
        $record = $this->snapshot_json['record'] ?? null;

        return is_array($record) ? ($record[$key] ?? null) : null;
    }

    /** @return BelongsTo<TemplateVersion, $this> */
    public function templateVersion(): BelongsTo
    {
        return $this->belongsTo(TemplateVersion::class);
    }
}
