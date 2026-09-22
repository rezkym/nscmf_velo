<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Security;

use App\Repositories\Contracts\Security\SessionRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Server-side session store queries (11 §50); revocation is a row delete. */
final class DatabaseSessionRepository implements SessionRepository
{
    public function activeAuthenticatedSessionIds(int $userId, CarbonImmutable $authenticatedAfter, int $activeSinceTimestamp, ?string $exceptId = null): array
    {
        return array_values(DB::table('sessions')
            ->where('user_id', $userId)
            ->whereNotNull('authenticated_at')
            ->where('authenticated_at', '>', $authenticatedAfter->format('Y-m-d H:i:s.u'))
            ->where('last_activity', '>', $activeSinceTimestamp)
            ->when($exceptId !== null, fn ($query) => $query->where('id', '!=', $exceptId))
            ->orderBy('authenticated_at')
            ->orderBy('id')
            ->pluck('id')
            ->map(fn (mixed $id): string => is_string($id) ? $id : '')
            ->filter(fn (string $id): bool => $id !== '')
            ->all());
    }

    public function delete(array $sessionIds): int
    {
        return $sessionIds === [] ? 0 : DB::table('sessions')->whereIn('id', $sessionIds)->delete();
    }

    public function deleteAllForUser(int $userId, ?string $exceptId = null): int
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->when($exceptId !== null, fn ($query) => $query->where('id', '!=', $exceptId))
            ->delete();
    }
}
