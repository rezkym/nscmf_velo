<?php

declare(strict_types=1);

namespace Tests\Support\Concurrency;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Races workflow actions on one record from separate PHP processes, each with its own MySQL
 * connection (16 §concurrency, BE-080). The coordinator holds the row lock until every worker
 * is blocked on SELECT … FOR UPDATE, then releases it, so the contention is real, not scheduled.
 */
final class WorkflowRace
{
    /**
     * @param  list<array{actor: int, action: string, reason?: string}>  $contenders
     * @return list<array{actor_id: int, action: string, outcome: 'committed'|'conflict', code: string|null}>
     */
    public static function run(int $recordId, int $expectedVersion, array $contenders): array
    {
        $workers = [];
        $locked = false;

        try {
            DB::beginTransaction();
            $locked = true;
            DB::table('nscmf_records')->where('id', $recordId)->lockForUpdate()->sole();

            foreach ($contenders as $contender) {
                $workers[] = self::start($contender['actor'], $recordId, $expectedVersion, $contender['reason'] ?? 'Concurrent workflow reason.', $contender['action']);
            }

            $deadline = microtime(true) + 10;
            foreach ($workers as &$worker) {
                $ready = self::read($worker, $deadline);
                if (($ready['kind'] ?? null) !== 'ready' || ! is_int($ready['connection_id'] ?? null)) {
                    throw new RuntimeException('Worker did not report a MySQL connection.');
                }
                $worker['connection_id'] = $ready['connection_id'];
            }
            unset($worker);

            $connectionIds = array_column($workers, 'connection_id');
            if (count(array_unique($connectionIds)) !== count($workers)) {
                throw new RuntimeException('Workers share a MySQL connection.');
            }
            foreach ($workers as $worker) {
                fwrite($worker['pipes'][0], "GO\n");
                fflush($worker['pipes'][0]);
            }

            self::awaitBlocked($connectionIds);
            DB::rollBack();
            $locked = false;

            $results = [];
            $deadline = microtime(true) + 15;
            foreach ($workers as $index => &$worker) {
                $message = self::read($worker, $deadline);
                $outcome = $message['outcome'] ?? null;
                if (($message['kind'] ?? null) !== 'result' || ! in_array($outcome, ['committed', 'conflict'], true)) {
                    throw new RuntimeException('Worker did not report a valid result.');
                }
                $code = $message['code'] ?? null;
                $results[] = [
                    'actor_id' => $contenders[$index]['actor'],
                    'action' => $contenders[$index]['action'],
                    'outcome' => $outcome,
                    'code' => is_string($code) ? $code : null,
                ];
            }
            unset($worker);

            return $results;
        } finally {
            if ($locked) {
                DB::rollBack();
            }
            foreach ($workers as $worker) {
                self::close($worker);
            }
        }
    }

    /**
     * @return array{process: resource, pipes: array<int, resource>, output: string, connection_id: int}
     */
    private static function start(int $actorId, int $recordId, int $version, string $reason, string $action): array
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
            [PHP_BINARY, base_path('tests/Support/Concurrency/workflow-worker.php'), (string) $actorId, (string) $recordId, (string) $version, $reason, $action],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            base_path(),
            $environment,
        );
        if (! is_resource($process)) {
            throw new RuntimeException('Could not start workflow worker.');
        }
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        return ['process' => $process, 'pipes' => $pipes, 'output' => '', 'connection_id' => 0];
    }

    /**
     * @param  list<int>  $connectionIds
     */
    private static function awaitBlocked(array $connectionIds): void
    {
        $deadline = microtime(true) + 10;
        do {
            $blocked = DB::table('information_schema.PROCESSLIST')->whereIn('ID', $connectionIds)->get(['INFO'])
                ->filter(fn (object $process): bool => is_string($process->INFO ?? null)
                    && str_contains(strtolower($process->INFO), 'nscmf_records') && str_contains(strtolower($process->INFO), 'for update'))
                ->count();
            if ($blocked === count($connectionIds)) {
                return;
            }
            usleep(50_000);
        } while (microtime(true) < $deadline);

        throw new RuntimeException('Workers never contended for the record lock.');
    }

    /**
     * @param  array{process: resource, pipes: array<int, resource>, output: string, connection_id: int}  $worker
     * @return array<string, mixed>
     */
    private static function read(array &$worker, float $deadline): array
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

                return array_filter($message, is_string(...), ARRAY_FILTER_USE_KEY);
            }
            if (! proc_get_status($worker['process'])['running']) {
                throw new RuntimeException('Workflow worker exited early: '.trim((string) stream_get_contents($worker['pipes'][2])));
            }
            usleep(20_000);
        }

        throw new RuntimeException('Timed out waiting for workflow worker.');
    }

    /**
     * @param  array{process: resource, pipes: array<int, resource>, output: string, connection_id: int}  $worker
     */
    private static function close(array $worker): void
    {
        if (proc_get_status($worker['process'])['running']) {
            proc_terminate($worker['process'], 9);
        }
        foreach ($worker['pipes'] as $pipe) {
            fclose($pipe);
        }
        proc_close($worker['process']);
    }
}
