<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Test-owned NSCMF records inserted directly, so a test can start from any business state
 * without depending on the workflow it is not testing.
 */
final class Records
{
    /**
     * @param  array<string, mixed>  $overrides
     */
    public static function create(User $owner, string $family = 'CHANGE', string $subtype = 'MAINTENANCE', array $overrides = []): int
    {
        $requestNo = 'TEST-'.Str::upper(Str::random(10));
        $id = (int) DB::table('nscmf_records')->insertGetId(array_merge([
            'request_no' => $requestNo,
            'request_no_normalized' => Str::lower($requestNo),
            'numbering_mode' => 'MANUAL',
            'family' => $family,
            'subtype' => $subtype,
            'owner_user_id' => $owner->id,
            'team_id' => $owner->team_id,
            'business_status' => 'DRAFT',
            'record_version' => 1,
            'is_archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));

        DB::table($family === 'ACTIVATION' ? 'nscmf_activation_details' : 'nscmf_change_details')->insert([
            'nscmf_record_id' => $id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return $id;
    }

    /** Moves a record past first Submit with a current iteration 1, as the workflow would. */
    public static function submitted(int $recordId, User $submitter, string $status = 'PENDING_REVIEW'): void
    {
        $iterationId = (int) DB::table('nscmf_workflow_iterations')->insertGetId([
            'nscmf_record_id' => $recordId, 'iteration_no' => 1, 'started_via' => 'FIRST_SUBMIT',
            'started_by_user_id' => $submitter->id, 'started_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('nscmf_records')->where('id', $recordId)->update([
            'business_status' => $status,
            'requested_by_user_id' => $submitter->id,
            'first_submitted_at' => now(),
            'current_workflow_iteration_id' => $iterationId,
            'request_date' => now()->toDateString(),
        ]);
    }

    public static function version(int $recordId): int
    {
        $version = DB::table('nscmf_records')->where('id', $recordId)->value('record_version');

        return is_int($version) ? $version : -1;
    }
}
