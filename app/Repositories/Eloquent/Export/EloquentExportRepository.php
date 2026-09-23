<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Export;

use App\Models\Export\ExportArtifact;
use App\Models\Export\ExportBatch;
use App\Models\Export\ExportRequest;
use App\Models\Export\ExportSnapshot;
use App\Models\Export\PdfIssuance;
use App\Models\Export\TemplateVersion;
use App\Repositories\Contracts\Export\ExportRepository;
use Carbon\CarbonImmutable;

final class EloquentExportRepository implements ExportRepository
{
    public function activeTemplate(): ?TemplateVersion
    {
        return TemplateVersion::query()->where('is_active', true)->latest('id')->first();
    }

    public function templateBySha(string $sha256): ?TemplateVersion
    {
        return TemplateVersion::query()->where('template_sha256', $sha256)->first();
    }

    public function createTemplate(array $attributes): TemplateVersion
    {
        return TemplateVersion::query()->create($attributes);
    }

    public function activateTemplate(TemplateVersion $template): void
    {
        TemplateVersion::query()->whereKeyNot($template->id)->update(['is_active' => false]);
        $template->forceFill(['is_active' => true])->save();
    }

    public function createBatch(array $attributes): ExportBatch
    {
        return ExportBatch::query()->create($attributes);
    }

    public function findBatch(int $batchId): ?ExportBatch
    {
        return ExportBatch::query()->with('requests.artifact')->find($batchId);
    }

    public function createRequest(array $attributes): ExportRequest
    {
        return ExportRequest::query()->create($attributes);
    }

    public function findRequest(int $exportId): ?ExportRequest
    {
        return ExportRequest::query()->with(['snapshot.templateVersion', 'artifact', 'issuance'])->find($exportId);
    }

    public function lockRequest(int $exportId): ExportRequest
    {
        return ExportRequest::query()->lockForUpdate()->findOrFail($exportId);
    }

    public function updateRequest(ExportRequest $request, array $attributes): void
    {
        $request->forceFill($attributes)->save();
    }

    public function createSnapshot(array $attributes): ExportSnapshot
    {
        return ExportSnapshot::query()->create($attributes);
    }

    public function createArtifact(array $attributes): ExportArtifact
    {
        return ExportArtifact::query()->create($attributes);
    }

    public function updateArtifact(ExportArtifact $artifact, array $attributes): void
    {
        $artifact->forceFill($attributes)->save();
    }

    public function expiredArtifacts(CarbonImmutable $now, int $limit): array
    {
        return array_values(ExportArtifact::query()
            ->whereNull('binary_purged_at')
            ->where('expires_at', '<=', $now)
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->all());
    }

    public function createIssuance(array $attributes): PdfIssuance
    {
        return PdfIssuance::query()->create($attributes);
    }

    public function issuanceBySha(string $sha256): ?PdfIssuance
    {
        return PdfIssuance::query()->with('snapshot')->where('final_pdf_sha256', $sha256)->first();
    }
}
