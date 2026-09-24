<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Nscmf;

use App\Models\Nscmf\NscmfRecord;
use App\Models\Nscmf\WorkflowIteration;
use App\Repositories\Contracts\Nscmf\WorkflowRepository;

final class EloquentWorkflowRepository implements WorkflowRepository
{
    public function createIteration(NscmfRecord $record, array $attributes): WorkflowIteration
    {
        return WorkflowIteration::query()->create(['nscmf_record_id' => $record->id, ...$attributes]);
    }

    public function currentIteration(NscmfRecord $record): ?WorkflowIteration
    {
        return $record->current_workflow_iteration_id === null
            ? null
            : WorkflowIteration::query()->lockForUpdate()->find($record->current_workflow_iteration_id);
    }

    public function updateIteration(WorkflowIteration $iteration, array $attributes): void
    {
        $iteration->forceFill($attributes)->save();
    }
}
