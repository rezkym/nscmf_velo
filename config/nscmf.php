<?php

declare(strict_types=1);

return [
    /*
     * True only for the served browser-test runtime (BE-005). It enables the disposable-runtime
     * guard's storage checks and the browser fixture commands; the guard refuses everything else.
     */
    'browser_testing' => (bool) env('NSCMF_BROWSER_TESTING', false),

    /*
     * Attachment limits are specification (06 §50–51, 11A §3–4, G06), not environment tuning.
     */
    'attachments' => [
        'max_bytes' => 20_000_000,
        'chunk_bytes' => 5_242_880,
        'max_active' => 10,
        'inactivity_hours' => 24,
        'extensions' => ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt', 'csv'],
    ],

    /*
     * Private clamd endpoint (14 §60–65, 20 §17). The finite timeout bounds one whole-file scan;
     * an unreachable, slow or erroring scanner fails closed.
     */
    'clamav' => [
        'transport' => env('NSCMF_CLAMAV_TRANSPORT', 'tcp'),
        'socket' => env('NSCMF_CLAMAV_SOCKET'),
        'host' => env('NSCMF_CLAMAV_HOST', '127.0.0.1'),
        'port' => (int) env('NSCMF_CLAMAV_PORT', 3310),
        'timeout_seconds' => (int) env('NSCMF_CLAMAV_TIMEOUT_SECONDS', 30),
    ],
];
