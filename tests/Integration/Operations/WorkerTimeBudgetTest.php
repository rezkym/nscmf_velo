<?php

declare(strict_types=1);

use App\Infrastructure\Malware\ClamdScanner;
use App\Infrastructure\Malware\ScannerUnavailable;
use App\Infrastructure\Pdf\LibreOfficeRenderer;
use App\Infrastructure\Pdf\RenderFailed;
use App\Jobs\FinalizeAttachmentUpload;
use App\Jobs\GenerateExport;
use Illuminate\Support\Facades\File;
use Tests\Support\FakeClamd;

/*
 * G15 — finite, evidence-based timeouts (14 §48, §63; 20 §17). A legitimate scan/render/sign must
 * fit inside its job, a job must end before the queue hands it to a second worker, and a stuck
 * scanner or renderer must be cut off by its own finite timeout.
 *
 * Measured locally 2026-09-24 (macOS arm64, clamav/clamav-debian:1.4, LibreOffice 26.8):
 * 20 MB file scan <= 1.9 s cold; dense archive (~250 MB unpacked) 6.6 s; one LibreOffice pass
 * ~1.7 s; signing ~0.01 s.
 */

/** @return array{0: float, 1: ?Throwable} seconds taken, and what was thrown */
function timed(callable $action): array
{
    $start = microtime(true);
    try {
        $action();
        $thrown = null;
    } catch (Throwable $exception) {
        $thrown = $exception;
    }

    return [microtime(true) - $start, $thrown];
}

it('ends every queued job before the queue would hand it to a second worker', function (): void {
    $retryAfter = config()->integer('queue.connections.database.retry_after');

    foreach ([FinalizeAttachmentUpload::class, GenerateExport::class] as $job) {
        $timeout = (new ReflectionClass($job))->getProperty('timeout')->getDefaultValue();
        expect($timeout)->toBeInt()->toBeLessThan($retryAfter, "{$job} must stop before retry_after");
    }
});

it('gives each job room for its slowest legitimate external step', function (): void {
    $scan = config()->integer('nscmf.clamav.timeout_seconds');
    $render = config()->integer('nscmf.renderer.timeout_seconds');
    $finalize = (new ReflectionClass(FinalizeAttachmentUpload::class))->getProperty('timeout')->getDefaultValue();
    $export = (new ReflectionClass(GenerateExport::class))->getProperty('timeout')->getDefaultValue();

    // Worst measured cases: a 6.6 s dense-archive scan and a 1.7 s render pass.
    expect($scan)->toBeGreaterThanOrEqual(3 * 7)
        ->and($render)->toBeGreaterThanOrEqual(3 * 2)
        // Finalization scans once; a page-range PDF export runs the renderer twice, then signs.
        ->and($finalize)->toBeGreaterThan($scan)
        ->and($export)->toBeGreaterThan(2 * $render);
});

it('cuts off a scanner that accepts the file but never answers', function (): void {
    [$address, $process] = FakeClamd::start('sleep(20);');

    [$elapsed, $thrown] = timed(fn () => (new ClamdScanner($address, 1))->scan(FakeClamd::input()));
    proc_terminate($process);

    expect($thrown)->toBeInstanceOf(ScannerUnavailable::class)
        ->and($elapsed)->toBeLessThan(3.0);
});

it('cuts off a scanner that keeps trickling bytes without ever finishing its reply', function (): void {
    [$address, $process] = FakeClamd::start('for ($i = 0; $i < 40; $i++) { fwrite($c, "s"); usleep(300000); }');

    [$elapsed, $thrown] = timed(fn () => (new ClamdScanner($address, 1))->scan(FakeClamd::input()));
    proc_terminate($process);

    expect($thrown)->toBeInstanceOf(ScannerUnavailable::class)
        ->and($elapsed)->toBeLessThan(3.0);
});

it('cuts off a renderer process that hangs and reports it as a render failure', function (): void {
    $workspace = sys_get_temp_dir().'/nscmf-stuck-render-'.bin2hex(random_bytes(4));
    mkdir($workspace, 0700, true);
    $executable = $workspace.'/soffice';
    file_put_contents($executable, "#!/bin/sh\nsleep 20\n");
    chmod($executable, 0700);

    [$elapsed, $thrown] = timed(fn () => (new LibreOfficeRenderer($executable, 1))->render(base_path('composer.json'), $workspace));
    File::deleteDirectory($workspace);

    expect($thrown)->toBeInstanceOf(RenderFailed::class)
        ->and($elapsed)->toBeLessThan(3.0);
});
