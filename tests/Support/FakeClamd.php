<?php

declare(strict_types=1);

namespace Tests\Support;

use RuntimeException;

/**
 * A misbehaving clamd on a loopback port, in its own process, for failure paths the real
 * scanner cannot be made to produce on demand. $behaviour is PHP code run with the accepted
 * connection in $c after the client's INSTREAM terminator arrives.
 */
final class FakeClamd
{
    /** @return array{0: string, 1: resource} the tcp:// address and the process handle */
    public static function start(string $behaviour): array
    {
        $script = <<<PHP
            \$server = stream_socket_server('tcp://127.0.0.1:0');
            echo stream_socket_get_name(\$server, false), "\\n";
            \$c = stream_socket_accept(\$server, 10);
            \$buffer = '';
            while (! str_ends_with(\$buffer, pack('N', 0)) && (\$chunk = fread(\$c, 65536)) !== false && \$chunk !== '') {
                \$buffer = substr(\$buffer . \$chunk, -8);
            }
            {$behaviour}
            PHP;
        $process = proc_open([PHP_BINARY, '-r', $script], [1 => ['pipe', 'w']], $pipes);
        if (! is_resource($process)) {
            throw new RuntimeException('Could not start the fake clamd.');
        }

        return ['tcp://'.trim((string) fgets($pipes[1])), $process];
    }

    /** @return resource */
    public static function input(string $bytes = 'harmless'): mixed
    {
        $stream = fopen('php://memory', 'w+b');
        if ($stream === false) {
            throw new RuntimeException('Could not open a memory stream.');
        }
        fwrite($stream, $bytes);
        rewind($stream);

        return $stream;
    }
}
