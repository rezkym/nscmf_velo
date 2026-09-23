<?php

declare(strict_types=1);

namespace App\Models\Export;

use Illuminate\Database\Eloquent\Model;

/**
 * A registered, immutable official workbook version (11 §41).
 *
 * @property int $id
 * @property string $version_label
 * @property string $private_object_key
 * @property string $template_sha256
 * @property string $mapping_version
 * @property bool $is_active
 */
class TemplateVersion extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'nscmf_template_versions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
