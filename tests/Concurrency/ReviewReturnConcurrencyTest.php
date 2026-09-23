<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\Actors;
use Tests\Support\Records;

/**
 * @return array{process: resource, pipes: array<int, resource>, output: string, connection_id?: int}
 */
function startReviewReturnWorker(int $actorId, int $recordId, string $reason, string $action = 'return'): array
{
    $environment = array_merge(getenv() ?: [], [
        'APP_ENV' => 'testing',
        'DB_CONNECTION' => 'mysql',
        'DB_URL' => '',
        'DB_HOST' => config()->string('database.connections.mysql.host'),
        'DB_PORT' => config()->string('database.connections.mysql.port'),
        'DB_DATABASE' => config()->string('database.connections.mysql.database'),
        'DB_USERNAME' => config()->string('database.connections.mysql.username'),
        'DB_PASSWORD' => config()->string('database.connections.mysql.password'),
    ]);
    $pipes = [];
    $process = proc_open(
        [PHP_BINARY, base_path('tests/Support/Concurrency/review-return-worker.php'), (string) $actorId, (string) $recordId, '1', $reason, $action],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        base_path(),
        $environment,
    );

    if (! is_resource($process)) {
        throw new RuntimeException('Could not start Reviewer Return worker.');
    }

    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    return ['process' => $process, 'pipes' => $pipes, 'output' => ''];
}

/**
 * @param  array{process: resource, pipes: array<int, resource>, output: string, connection_id?: int}  $worker
 * @return array<string, mixed>
 */
function readReviewReturnMessage(array &$worker, float $deadline): array
{
    while (microtime(true) < $deadline) {
        $worker['output'] .= (string) stream_get_contents($worker['pipes'][1]);
        $newline = strpos($worker['output'], "\n");

        if ($newline !== false) {
            $line = substr($worker['output'], 0, $newline);
            $worker['output'] = substr($worker['output'], $newline + 1);

            $message = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($message)) {
                throw new RuntimeException('Worker sent an invalid protocol message.');
            }

            $fields = [];
            foreach ($message as $key => $value) {
                if (! is_string($key)) {
                    throw new RuntimeException('Worker sent an invalid protocol message.');
                }

                $fields[$key] = $value;
            }

            return $fields;
        }

        if (! proc_get_status($worker['process'])['running']) {
            throw new RuntimeException('Reviewer Return worker exited early: '.trim((string) stream_get_contents($worker['pipes'][2])));
        }

        usleep(20_000);
    }

    throw new RuntimeException('Timed out waiting for Reviewer Return worker.');
}

/** @param array{process: resource, pipes: array<int, resource>, output: string, connection_id?: int} $worker */
function readReviewReturnReady(array &$worker, float $deadline): int
{
    $message = readReviewReturnMessage($worker, $deadline);
    if (($message['kind'] ?? null) !== 'ready' || ! is_int($message['connection_id'] ?? null)) {
        throw new RuntimeException('Worker did not report a valid MySQL connection.');
    }

    return $message['connection_id'];
}

/**
 * @param  array{process: resource, pipes: array<int, resource>, output: string, connection_id?: int}  $worker
 * @return array{actor_id: int, outcome: 'committed'|'conflict', code: string|null}
 */
function readReviewReturnResult(array &$worker, float $deadline): array
{
    $message = readReviewReturnMessage($worker, $deadline);
    $outcome = $message['outcome'] ?? null;
    $code = $message['code'] ?? null;
    if (($message['kind'] ?? null) !== 'result' || ! is_int($message['actor_id'] ?? null)
        || ! in_array($outcome, ['committed', 'conflict'], true)
        || ($outcome === 'conflict' && ! is_string($code))) {
        throw new RuntimeException('Worker did not report a valid Reviewer Return result.');
    }

    return ['actor_id' => $message['actor_id'], 'outcome' => $outcome, 'code' => is_string($code) ? $code : null];
}

/** @param array{process: resource, pipes: array<int, resource>, output: string, connection_id?: int} $worker */
function closeReviewReturnWorker(array $worker): void
{
    $status = proc_get_status($worker['process']);
    if ($status['running']) {
        proc_terminate($worker['process']);

        $deadline = microtime(true) + 1;
        do {
            usleep(10_000);
            $status = proc_get_status($worker['process']);
        } while ($status['running'] && microtime(true) < $deadline);

        if ($status['running']) {
            proc_terminate($worker['process'], 9);
        }
    }

    foreach ($worker['pipes'] as $pipe) {
        fclose($pipe);
    }

    proc_close($worker['process']);
}

it('lets exactly one of two contending eligible Reviewer Returns commit', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $reviewers = [Actors::reviewer(), Actors::reviewer()];
    $reasons = [
        $reviewers[0]->id => 'First reviewer needs a revision.',
        $reviewers[1]->id => 'Second reviewer needs a revision.',
    ];
    $before = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iterationBefore = (array) DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    $workers = [];
    $coordinatorLocked = false;

    try {
        DB::beginTransaction();
        $coordinatorLocked = true;
        DB::table('nscmf_records')->where('id', $recordId)->lockForUpdate()->sole();

        foreach ($reviewers as $reviewer) {
            $workers[$reviewer->id] = startReviewReturnWorker($reviewer->id, $recordId, $reasons[$reviewer->id]);
        }

        $deadline = microtime(true) + 10;
        foreach ($workers as &$worker) {
            $worker['connection_id'] = readReviewReturnReady($worker, $deadline);
        }
        unset($worker);

        $connectionIds = array_column($workers, 'connection_id');
        expect(count(array_unique($connectionIds)))->toBe(2);

        foreach ($workers as $worker) {
            fwrite($worker['pipes'][0], "GO\n");
            fflush($worker['pipes'][0]);
        }

        $overlapping = [];
        $deadline = microtime(true) + 10;
        do {
            $processes = DB::table('information_schema.PROCESSLIST')
                ->whereIn('ID', $connectionIds)->get(['ID', 'INFO']);
            $overlapping = [];
            foreach ($processes as $process) {
                $query = is_string($process->INFO) ? strtolower($process->INFO) : '';
                if (str_contains($query, 'nscmf_records') && str_contains($query, 'for update')
                    && (is_int($process->ID) || (is_string($process->ID) && ctype_digit($process->ID)))) {
                    $overlapping[] = (int) $process->ID;
                }
            }

            if (count($overlapping) === 2) {
                break;
            }

            usleep(50_000);
        } while (microtime(true) < $deadline);

        expect($overlapping)->toHaveCount(2);
        DB::rollBack();
        $coordinatorLocked = false;

        $results = [];
        $deadline = microtime(true) + 15;
        foreach ($workers as $actorId => &$worker) {
            $results[$actorId] = readReviewReturnResult($worker, $deadline);
            expect($results[$actorId]['actor_id'])->toBe($actorId);
        }
        unset($worker);

        $winners = array_filter($results, fn (array $result): bool => $result['outcome'] === 'committed');
        $losers = array_filter($results, fn (array $result): bool => $result['outcome'] === 'conflict');
        expect($winners)->toHaveCount(1)
            ->and($losers)->toHaveCount(1);
        $winnerId = array_key_first($winners);
        $loser = current($losers);
        if (! is_int($winnerId) || ! is_array($loser)) {
            throw new RuntimeException('Reviewer Return did not yield one winner and one loser.');
        }
        expect($loser['code'])->toBeIn(['NSCMF_STATE_CONFLICT', 'NSCMF_VERSION_CONFLICT']);

        $after = DB::table('nscmf_records')->where('id', $recordId)->sole();
        if (! is_int($before->record_version) || ! is_int($after->record_version)) {
            throw new RuntimeException('Reviewer Return record version was not an integer.');
        }
        $iterationAfter = (array) DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
        $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
        expect($after->business_status)->toBe('REVISION_REQUIRED')
            ->and($after->record_version)->toBe($before->record_version + 1)
            ->and($after->current_workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
            ->and((bool) $after->is_archived)->toBeFalse()
            ->and($iterationAfter)->toBe($iterationBefore)
            ->and(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1)
            ->and($audit->event_type)->toBe('REVIEW_RETURNED')
            ->and($audit->actor_user_id)->toBe($winnerId)
            ->and($audit->reason)->toBe($reasons[$winnerId])
            ->and($audit->from_status)->toBe('PENDING_REVIEW')
            ->and($audit->to_status)->toBe('REVISION_REQUIRED')
            ->and($audit->record_version_before)->toBe($before->record_version)
            ->and($audit->record_version_after)->toBe($after->record_version)
            ->and($audit->workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
            ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(1);

        fwrite(STDOUT, sprintf(
            "MySQL Reviewer Return contention: connections %d,%d; winner actor %d; loser %s; version %d→%d; one audit.\n",
            ...[$connectionIds[0], $connectionIds[1], $winnerId, $loser['code'], $before->record_version, $after->record_version],
        ));
    } finally {
        if ($coordinatorLocked) {
            DB::rollBack();
        }

        foreach ($workers as $worker) {
            closeReviewReturnWorker($worker);
        }

        // The baseline users migration restores a unique legacy email during rollback.
        // Remove this case's users first so DatabaseMigrations can reverse it safely.
        Schema::withoutForeignKeyConstraints(function () use ($owner, $reviewers): void {
            DB::table('users')->whereIn('id', [$owner->id, ...array_map(fn ($reviewer): int => $reviewer->id, $reviewers)])->delete();
        });
    }
});

it('lets exactly one of competing Reviewer Reject and Return commit', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $rejecter = Actors::reviewer();
    $returner = Actors::reviewer();
    $reasons = [$rejecter->id => 'Terminal reviewer rejection.', $returner->id => 'Return for further revision.'];
    $before = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iterationBefore = (array) DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    $workers = [];
    $coordinatorLocked = false;

    try {
        DB::beginTransaction();
        $coordinatorLocked = true;
        DB::table('nscmf_records')->where('id', $recordId)->lockForUpdate()->sole();

        $workers[$rejecter->id] = startReviewReturnWorker($rejecter->id, $recordId, $reasons[$rejecter->id], 'reject');
        $workers[$returner->id] = startReviewReturnWorker($returner->id, $recordId, $reasons[$returner->id]);
        $deadline = microtime(true) + 10;
        foreach ($workers as &$worker) {
            $worker['connection_id'] = readReviewReturnReady($worker, $deadline);
        }
        unset($worker);
        $connectionIds = array_column($workers, 'connection_id');
        expect(count(array_unique($connectionIds)))->toBe(2);
        foreach ($workers as $worker) {
            fwrite($worker['pipes'][0], "GO\n");
            fflush($worker['pipes'][0]);
        }

        $overlapping = [];
        $deadline = microtime(true) + 10;
        do {
            $processes = DB::table('information_schema.PROCESSLIST')->whereIn('ID', $connectionIds)->get(['ID', 'INFO']);
            $overlapping = [];
            foreach ($processes as $process) {
                $query = is_string($process->INFO) ? strtolower($process->INFO) : '';
                if (str_contains($query, 'nscmf_records') && str_contains($query, 'for update')
                    && (is_int($process->ID) || (is_string($process->ID) && ctype_digit($process->ID)))) {
                    $overlapping[] = (int) $process->ID;
                }
            }
            if (count($overlapping) === 2) {
                break;
            }
            usleep(50_000);
        } while (microtime(true) < $deadline);
        expect($overlapping)->toHaveCount(2);
        DB::rollBack();
        $coordinatorLocked = false;

        $results = [];
        $deadline = microtime(true) + 15;
        foreach ($workers as $actorId => &$worker) {
            $results[$actorId] = readReviewReturnResult($worker, $deadline);
            expect($results[$actorId]['actor_id'])->toBe($actorId);
        }
        unset($worker);
        $winners = array_filter($results, fn (array $result): bool => $result['outcome'] === 'committed');
        $losers = array_filter($results, fn (array $result): bool => $result['outcome'] === 'conflict');
        expect($winners)->toHaveCount(1)->and($losers)->toHaveCount(1);
        $winnerId = array_key_first($winners);
        $loser = current($losers);
        if (! is_int($winnerId) || ! is_array($loser)) {
            throw new RuntimeException('Reviewer action contention did not yield one winner and one loser.');
        }
        expect($loser['code'])->toBeIn(['NSCMF_STATE_CONFLICT', 'NSCMF_VERSION_CONFLICT']);

        $after = DB::table('nscmf_records')->where('id', $recordId)->sole();
        if (! is_int($before->record_version) || ! is_int($after->record_version)) {
            throw new RuntimeException('Reviewer action record version was not an integer.');
        }
        $iterationAfter = (array) DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
        $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
        $rejectWon = $winnerId === $rejecter->id;
        expect($after->business_status)->toBe($rejectWon ? 'REJECTED' : 'REVISION_REQUIRED')
            ->and($after->record_version)->toBe($before->record_version + 1)
            ->and($after->current_workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
            ->and($iterationAfter['id'])->toBe($iterationBefore['id'])
            ->and($iterationAfter['iteration_no'])->toBe($iterationBefore['iteration_no'])
            ->and($iterationAfter['closed_status'])->toBe($rejectWon ? 'REJECTED' : null)
            ->and($iterationAfter['closed_at'] === null)->toBe(! $rejectWon)
            ->and($audit->event_type)->toBe($rejectWon ? 'REVIEW_REJECTED' : 'REVIEW_RETURNED')
            ->and($audit->actor_user_id)->toBe($winnerId)
            ->and($audit->reason)->toBe($reasons[$winnerId])
            ->and($audit->from_status)->toBe('PENDING_REVIEW')
            ->and($audit->to_status)->toBe($after->business_status)
            ->and($audit->record_version_before)->toBe($before->record_version)
            ->and($audit->record_version_after)->toBe($after->record_version)
            ->and($audit->workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
            ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(1);
        fwrite(STDOUT, sprintf(
            "MySQL Reviewer Reject/Return contention: connections %d,%d; winner %s actor %d; loser %s; version %d→%d; one audit.\n",
            $connectionIds[0], $connectionIds[1], $rejectWon ? 'Reject' : 'Return', $winnerId, $loser['code'], $before->record_version, $after->record_version,
        ));
    } finally {
        if ($coordinatorLocked) {
            DB::rollBack();
        }
        foreach ($workers as $worker) {
            closeReviewReturnWorker($worker);
        }
        Schema::withoutForeignKeyConstraints(function () use ($owner, $rejecter, $returner): void {
            DB::table('users')->whereIn('id', [$owner->id, $rejecter->id, $returner->id])->delete();
        });
    }
});
