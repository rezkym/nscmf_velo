<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Security;

use Carbon\CarbonImmutable;

interface SessionRepository
{
    /**
     * Authenticated, not idle-expired and not absolutely-expired sessions of a user, oldest first.
     *
     * @return list<string>
     */
    public function activeAuthenticatedSessionIds(int $userId, CarbonImmutable $authenticatedAfter, int $activeSinceTimestamp, ?string $exceptId = null): array;

    /**
     * @param  list<string>  $sessionIds
     */
    public function delete(array $sessionIds): int;

    public function deleteAllForUser(int $userId, ?string $exceptId = null): int;
}
