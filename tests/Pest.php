<?php

declare(strict_types=1);

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Pest\TestSuite;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Integration');

pest()->extend(TestCase::class)
    ->use(DatabaseMigrations::class)
    ->in('Concurrency');

/**
 * Authenticates $user with a fresh absolute-lifetime anchor (10 §18), as a real login would.
 */
function signIn(User $user, ?int $authenticatedAt = null): TestCase
{
    $test = TestSuite::getInstance()->test;
    assert($test instanceof TestCase);

    $test->actingAs($user)->withSession(['nscmf' => ['authenticated_at' => $authenticatedAt ?? CarbonImmutable::now()->getTimestamp()]]);

    return $test;
}

/** Where a successful Reviewer action lands: the review detail, else the record, else the Dashboard. */
function reviewActionDestination(User $actor, int $recordId): string
{
    return $actor->can('nscmf.review') ? "/review/{$recordId}" : ($actor->can('nscmf.view') ? "/nscmf/{$recordId}" : '/dashboard');
}
