<?php

declare(strict_types=1);

namespace Tests\Integration\Database;

use Illuminate\Support\Facades\DB;

/**
 * Minimal raw rows for schema tests. Raw inserts keep these tests about the database
 * contract (11) rather than about models or services.
 */
final class SchemaFixtures
{
    public static function team(string $name = 'Schema Team'): int
    {
        return (int) DB::table('teams')->insertGetId([
            'name' => $name,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public static function user(string $username = 'schema.user', ?int $teamId = null): int
    {
        return (int) DB::table('users')->insertGetId([
            'team_id' => $teamId,
            'name' => 'Schema User',
            'username' => $username,
            'password' => 'not-a-real-hash',
            'is_active' => true,
            'must_change_password' => false,
            'is_protected_superadmin' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    public static function record(array $overrides = []): int
    {
        $teamId = $overrides['team_id'] ?? self::team('Record Team '.uniqid());
        $ownerId = $overrides['owner_user_id'] ?? self::user('owner.'.uniqid());
        $requestNo = 'NSCMF-202609-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT).uniqid();

        return (int) DB::table('nscmf_records')->insertGetId(array_merge([
            'request_no' => $requestNo,
            'request_no_normalized' => strtolower($requestNo),
            'numbering_mode' => 'AUTOMATIC',
            'family' => 'CHANGE',
            'subtype' => 'MAINTENANCE',
            'request_date' => null,
            'owner_user_id' => $ownerId,
            'team_id' => $teamId,
            'business_status' => 'DRAFT',
            'record_version' => 1,
            'is_archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }
}
