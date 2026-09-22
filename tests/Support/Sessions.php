<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

/**
 * Real database-session helpers. A feature test normally reuses one in-memory session
 * store; forgetting it and replaying only the cookie makes the next request read the
 * sessions table exactly like a separate browser request would.
 */
final class Sessions
{
    /** Signs in through the real POST /login flow and returns the stored session id. */
    public static function login(User $user, string $password = Actors::PASSWORD): string
    {
        post('/login', ['username' => $user->username, 'password' => $password])->assertRedirect('/dashboard');

        return session()->getId();
    }

    /** Starts the next request from the sessions table alone, carrying only the cookie. */
    public static function reuse(string $sessionId): TestCase
    {
        self::forgetInMemoryState();

        return withCookie(config()->string('session.cookie'), $sessionId);
    }

    public static function forgetInMemoryState(): void
    {
        app('auth')->forgetGuards();
        app('session')->forgetDrivers();
        app()->forgetInstance('session.store');
    }

    /** Inserts an already-authenticated session row, as another browser would have left it. */
    public static function existing(User $user, string $authenticatedAt, ?int $lastActivity = null): string
    {
        $id = bin2hex(random_bytes(20));

        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'other-browser',
            'payload' => base64_encode(json_encode(['nscmf' => ['authenticated_at' => strtotime($authenticatedAt)]], JSON_THROW_ON_ERROR)),
            'last_activity' => $lastActivity ?? time(),
            'authenticated_at' => $authenticatedAt,
        ]);

        return $id;
    }
}
