<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Nscmf;

use App\Models\Nscmf\NscmfRecord;
use App\Models\Nscmf\WorkflowIteration;

interface WorkflowRepository
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createIteration(NscmfRecord $record, array $attributes): WorkflowIteration;

    public function currentIteration(NscmfRecord $record): ?WorkflowIteration;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateIteration(WorkflowIteration $iteration, array $attributes): void;
}
