<?php

declare(strict_types=1);

return [
    /*
     * True only for the served browser-test runtime (BE-005). It enables the disposable-runtime
     * guard's storage checks and the browser fixture commands; the guard refuses everything else.
     */
    'browser_testing' => (bool) env('NSCMF_BROWSER_TESTING', false),
];
