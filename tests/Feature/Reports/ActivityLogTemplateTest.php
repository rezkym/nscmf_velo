<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Actors;
use Tests\Support\Records;
use Tests\Support\SyntheticWorkbook;

/*
 * T82A / G26 — one active template per kind (11 §41, 14 §70A): registering the Activity Log
 * workbook never deactivates the official NSCMF form, and NSCMF exports keep using the form.
 */

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Queue::fake();
});

/** A file whose bytes differ from the synthetic form, so it registers as its own version. */
function otherTemplateFile(): string
{
    $path = tempnam(sys_get_temp_dir(), 'log').'.xlsx';
    file_put_contents($path, 'activity-log-template-'.uniqid());

    return $path;
}

it('registers an Activity Log template as its own kind without touching the active NSCMF form', function (): void {
    Artisan::call('nscmf:template:register', ['path' => SyntheticWorkbook::path(), '--label' => 'NSCMF-Form-3.0', '--activate' => true]);
    $exit = Artisan::call('nscmf:template:register', ['path' => otherTemplateFile(), '--label' => 'NSCMF-Log-1.0', '--kind' => 'activity-log', '--activate' => true]);

    expect($exit)->toBe(0);
    $versions = DB::table('nscmf_template_versions')->orderBy('id')->get(['template_kind', 'mapping_version', 'is_active'])
        ->map(fn (object $row): array => (array) $row)->all();
    expect($versions)->toBe([
        ['template_kind' => 'NSCMF_FORM', 'mapping_version' => 'nscmf-form-3.0/v1', 'is_active' => 1],
        ['template_kind' => 'ACTIVITY_LOG', 'mapping_version' => 'nscmf-activity-log/v1', 'is_active' => 1],
    ]);
});

it('keeps NSCMF exports on the NSCMF form while an Activity Log template is active', function (): void {
    Artisan::call('nscmf:template:register', ['path' => SyntheticWorkbook::path(), '--label' => 'NSCMF-Form-3.0', '--activate' => true]);
    Artisan::call('nscmf:template:register', ['path' => otherTemplateFile(), '--label' => 'NSCMF-Log-1.0', '--kind' => 'activity-log', '--activate' => true]);
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);

    signIn($owner)->postJson("/nscmf/{$recordId}/exports", ['format' => 'XLSX'])->assertStatus(202);

    $formId = DB::table('nscmf_template_versions')->where('template_kind', 'NSCMF_FORM')->value('id');
    expect(DB::table('nscmf_export_snapshots')->value('template_version_id'))->toBe($formId);
});

it('refuses an unknown template kind', function (): void {
    expect(Artisan::call('nscmf:template:register', ['path' => otherTemplateFile(), '--kind' => 'invoice']))->toBe(1)
        ->and(DB::table('nscmf_template_versions')->count())->toBe(0);
});
