<?php

declare(strict_types=1);

namespace App\Infrastructure\Session;

use Carbon\CarbonImmutable;
use Illuminate\Session\DatabaseSessionHandler;

/**
 * Laravel's database session handler plus the sessions.authenticated_at column (11 §50),
 * copied from the server-side session attribute nscmf.authenticated_at on every write so the
 * absolute-lifetime anchor and oldest-session order are queryable.
 */
final class AnchoredDatabaseSessionHandler extends DatabaseSessionHandler
{
    /**
     * @param  string  $data
     * @return array<string, mixed>
     */
    protected function getDefaultPayload($data)
    {
        $payload = ['authenticated_at' => self::anchorFrom($data)];

        foreach (parent::getDefaultPayload($data) as $column => $value) {
            $payload[(string) $column] = $value;
        }

        return $payload;
    }

    private static function anchorFrom(string $data): ?string
    {
        $attributes = json_decode($data, true);
        $anchor = is_array($attributes) && is_array($attributes['nscmf'] ?? null) ? ($attributes['nscmf']['authenticated_at'] ?? null) : null;

        return is_int($anchor)
            ? CarbonImmutable::createFromTimestamp($anchor, config()->string('app.timezone'))->format('Y-m-d H:i:s.u')
            : null;
    }
}
