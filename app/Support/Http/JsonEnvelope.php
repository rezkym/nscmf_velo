<?php

declare(strict_types=1);

namespace App\Support\Http;

use Illuminate\Http\JsonResponse;

/** Standard success envelope {data, meta} for internal JSON endpoints (12 §8), never cached. */
final class JsonEnvelope
{
    /**
     * @param  array<string, mixed>|list<mixed>  $data
     * @param  array<string, mixed>  $meta
     */
    public static function ok(array $data, array $meta = [], int $status = 200): JsonResponse
    {
        return new JsonResponse(['data' => $data, 'meta' => (object) $meta], $status, ['Cache-Control' => 'no-store, private']);
    }
}
