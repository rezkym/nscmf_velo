<?php

declare(strict_types=1);

/*
 * Locked authentication/session policy (10 §7, §13, §16–26; 14 §36–38). These values are
 * specification, not environment tuning, so they deliberately do not read env().
 */
return [
    'session' => [
        'absolute_lifetime_seconds' => 8 * 60 * 60,
        'max_active_sessions' => 2,
    ],

    'reauthentication' => [
        'proof_lifetime_seconds' => 15 * 60,
    ],

    'password' => [
        'min_length' => 6,
    ],

    // PROVISIONAL (gap G05, approved 2026-09-22): failures per username + IP inside the window.
    'login_throttle' => [
        'max_attempts' => 5,
        'decay_seconds' => 60,
    ],

    'reauthentication_throttle' => [
        'max_attempts' => 5,
        'decay_seconds' => 60,
    ],
];
