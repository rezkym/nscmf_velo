<?php

declare(strict_types=1);

use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use App\Support\Runtime\DisposableRuntimeGuard;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__, 3).'/vendor/autoload.php';

$app = require dirname(__DIR__, 3).'/bootstrap/app.php';
if (! $app instanceof Application) {
    throw new RuntimeException('Reviewer Return worker could not boot the application.');
}

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
if (! $app->environment('testing') || DisposableRuntimeGuard::currentProblems() !== []) {
    throw new RuntimeException('Refusing to run Reviewer Return worker outside a disposable testing runtime.');
}

if (config()->string('database.default') !== 'mysql'
    || config()->string('database.connections.mysql.host') !== getenv('DB_HOST')
    || config()->string('database.connections.mysql.port') !== getenv('DB_PORT')
    || config()->string('database.connections.mysql.database') !== getenv('DB_DATABASE')
    || config()->string('database.connections.mysql.username') !== getenv('DB_USERNAME')
    || config()->string('database.connections.mysql.password') !== getenv('DB_PASSWORD')) {
    throw new RuntimeException('Reviewer Return worker database configuration differs from its declared test connection.');
}

$arguments = $_SERVER['argv'] ?? null;
if (! is_array($arguments) || count($arguments) !== 6
    || ! is_string($arguments[1]) || ! ctype_digit($arguments[1])
    || ! is_string($arguments[2]) || ! ctype_digit($arguments[2])
    || ! is_string($arguments[3]) || ! ctype_digit($arguments[3])
    || ! is_string($arguments[4])
    || ! in_array($arguments[5], ['return', 'reject'], true)) {
    throw new RuntimeException('Reviewer Return worker received invalid arguments.');
}

$actorId = (int) $arguments[1];
$recordId = (int) $arguments[2];
$expectedVersion = (int) $arguments[3];
$reason = $arguments[4];
$action = $arguments[5];

$actor = User::query()->findOrFail($actorId);
$connection = DB::selectOne('SELECT CONNECTION_ID() AS id');
if (! is_object($connection) || ! isset($connection->id)
    || (! is_int($connection->id) && (! is_string($connection->id) || ! ctype_digit($connection->id)))) {
    throw new RuntimeException('Reviewer Return worker could not identify its MySQL connection.');
}
$connectionId = (int) $connection->id;
echo json_encode(['kind' => 'ready', 'connection_id' => $connectionId], JSON_THROW_ON_ERROR)."\n";
flush();

$read = [STDIN];
$write = $except = [];
if (stream_select($read, $write, $except, 10) !== 1 || trim((string) fgets(STDIN)) !== 'GO') {
    exit(2);
}

DB::statement('SET SESSION innodb_lock_wait_timeout = 20');

try {
    if ($action === 'reject') {
        $app->make(NscmfWorkflowService::class)->reject($actor, $recordId, $expectedVersion, $reason);
    } else {
        $app->make(NscmfWorkflowService::class)->returnForRevision($actor, $recordId, $expectedVersion, $reason);
    }
    echo json_encode(['kind' => 'result', 'outcome' => 'committed', 'actor_id' => $actorId], JSON_THROW_ON_ERROR)."\n";
} catch (DomainRuleException $exception) {
    echo json_encode([
        'kind' => 'result', 'outcome' => 'conflict', 'actor_id' => $actorId,
        'code' => $exception->errorCode,
    ], JSON_THROW_ON_ERROR)."\n";
} catch (Throwable $exception) {
    fwrite(STDERR, $exception::class."\n");
    exit(3);
}
