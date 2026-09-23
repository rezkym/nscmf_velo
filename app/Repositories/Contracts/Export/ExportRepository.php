<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Export;

use App\Models\Export\ExportArtifact;
use App\Models\Export\ExportBatch;
use App\Models\Export\ExportRequest;
use App\Models\Export\ExportSnapshot;
use App\Models\Export\PdfIssuance;
use App\Models\Export\TemplateVersion;
use Carbon\CarbonImmutable;

interface ExportRepository
{
    public function activeTemplate(): ?TemplateVersion;

    public function templateBySha(string $sha256): ?TemplateVersion;

    /** @param array<string, mixed> $attributes */
    public function createTemplate(array $attributes): TemplateVersion;

    /** Makes $template the only active version; older versions stay for history. */
    public function activateTemplate(TemplateVersion $template): void;

    /** @param array<string, mixed> $attributes */
    public function createBatch(array $attributes): ExportBatch;

    public function findBatch(int $batchId): ?ExportBatch;

    /** @param array<string, mixed> $attributes */
    public function createRequest(array $attributes): ExportRequest;

    public function findRequest(int $exportId): ?ExportRequest;

    public function lockRequest(int $exportId): ExportRequest;

    /** @param array<string, mixed> $attributes */
    public function updateRequest(ExportRequest $request, array $attributes): void;

    /** @param array<string, mixed> $attributes */
    public function createSnapshot(array $attributes): ExportSnapshot;

    /** @param array<string, mixed> $attributes */
    public function createArtifact(array $attributes): ExportArtifact;

    /** @param array<string, mixed> $attributes */
    public function updateArtifact(ExportArtifact $artifact, array $attributes): void;

    /**
     * READY artifacts whose 168h window has passed and whose binary still exists.
     *
     * @return list<ExportArtifact>
     */
    public function expiredArtifacts(CarbonImmutable $now, int $limit): array;

    /** @param array<string, mixed> $attributes */
    public function createIssuance(array $attributes): PdfIssuance;

    public function issuanceBySha(string $sha256): ?PdfIssuance;
}
