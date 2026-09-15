<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | NSCMF keeps every binary private and does not use public or third-party
    | object storage in the current MVP (08_Tech_Stack_Specification.md §42).
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => false,
            'throw' => false,
            'report' => false,
        ],

        // Durable private NSCMF binaries: upload chunks, assembly, attachments, exports, templates.
        // Production roots must be persistent/non-ephemeral (14_Environment_Specification.md §49-§51).
        'nscmf_private' => [
            'driver' => 'local',
            'root' => env('NSCMF_PRIVATE_STORAGE_ROOT') ?: storage_path('app/private/nscmf'),
            'visibility' => 'private',
            'serve' => false,
            'throw' => true,
            'report' => false,
        ],

        // Short-lived private workspace (validator uploads, renderer scratch); may be ephemeral (§52).
        'nscmf_runtime_tmp' => [
            'driver' => 'local',
            'root' => env('NSCMF_RUNTIME_TMP_ROOT') ?: storage_path('app/private/nscmf-runtime-tmp'),
            'visibility' => 'private',
            'serve' => false,
            'throw' => true,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [],

];
