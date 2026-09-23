<?php

declare(strict_types=1);

return [
    /*
     * True only for the served browser-test runtime (BE-005). It enables the disposable-runtime
     * guard's storage checks and the browser fixture commands; the guard refuses everything else.
     */
    'browser_testing' => (bool) env('NSCMF_BROWSER_TESTING', false),

    /*
     * Hostname of the public validator ingress (20 §19–21). Requests for it reach only
     * /ispdfvalid; empty means no separate public hostname is configured.
     */
    'public_host' => (string) env('NSCMF_PUBLIC_HOST', ''),

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
        'transport' => env('NSCMF_CLAMAV_TRANSPORT') ?: 'tcp',
        'socket' => env('NSCMF_CLAMAV_SOCKET'),
        'host' => env('NSCMF_CLAMAV_HOST') ?: '127.0.0.1',
        'port' => (int) env('NSCMF_CLAMAV_PORT') ?: 3310,
        'timeout_seconds' => (int) env('NSCMF_CLAMAV_TIMEOUT_SECONDS') ?: 30,
    ],

    /*
     * Spreadsheet renderer (14 §71–76). LibreOffice Headless is the first candidate; it is used
     * only once qualified (BE-114). An empty executable means PDF export is not ready.
     */
    'renderer' => [
        'driver' => env('NSCMF_RENDERER_DRIVER', 'libreoffice'),
        'executable' => (string) env('NSCMF_RENDERER_EXECUTABLE', ''),
        'timeout_seconds' => (int) env('NSCMF_RENDERER_TIMEOUT_SECONDS') ?: 60,
    ],

    /*
     * Organization PDF signing (DG-02). The PKCS#12 container lives outside the web root on
     * private disk; its passphrase comes only from the environment and is never persisted.
     */
    'signing' => [
        'p12_path' => (string) env('NSCMF_SIGNING_P12_PATH', ''),
        'p12_passphrase' => (string) env('NSCMF_SIGNING_P12_PASSPHRASE', ''),
        'organization' => (string) env('NSCMF_SIGNING_ORGANIZATION', 'NSCMF Organization'),
    ],

    /* Generated export binaries are kept exactly 168 hours (12 §69). */
    'exports' => [
        'retention_hours' => 168,
    ],
];
