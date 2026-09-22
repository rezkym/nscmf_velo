<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Integration');

/**
 * Authenticates $user with a fresh absolute-lifetime anchor (10 §18), as a real login would.
 */
function signIn(User $user, ?int $authenticatedAt = null): TestCase
{
    $test = test();
    assert($test instanceof TestCase);

    $test->actingAs($user)->withSession(['nscmf' => ['authenticated_at' => $authenticatedAt ?? time()]]);

    return $test;
}
