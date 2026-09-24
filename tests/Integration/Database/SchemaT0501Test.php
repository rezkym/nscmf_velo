<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-007 / T05-1 — teams and users (11 §8–9).
 */

it('creates teams as organizational metadata only', function (): void {
    expect(Schema::columns('teams'))->toHaveKeys(['id', 'name', 'is_active', 'created_at', 'updated_at'])
        ->and(Schema::columns('teams')['name']['type'])->toBe('varchar(150)')
        ->and(Schema::columns('teams')['is_active']['nullable'])->toBeFalse()
        ->and(Schema::columns('teams')['is_active']['default'])->toBe('1');

    foreach (['units', 'divisions', 'reviewer_scopes', 'approver_scopes', 'team_permission_scopes'] as $forbidden) {
        expect(Schema::tableExists($forbidden))->toBeFalse();
    }
});

it('rejects a second Team whose name differs only by case', function (): void {
    SchemaFixtures::team('Team NOC');

    expect(Schema::rejects(fn () => SchemaFixtures::team('team noc')))->toBeTrue();
});

it('shapes users with username login, nullable Team and protected flags', function (): void {
    $columns = Schema::columns('users');

    expect(array_keys($columns))->toEqualCanonicalizing([
        'id', 'team_id', 'name', 'username', 'password', 'is_active', 'must_change_password',
        'is_protected_superadmin', 'password_changed_at', 'remember_token', 'created_at', 'updated_at',
    ])
        ->and($columns['id']['type'])->toBe('bigint unsigned')
        ->and($columns['team_id']['nullable'])->toBeTrue()
        ->and($columns['name']['type'])->toBe('varchar(150)')
        ->and($columns['username']['type'])->toBe('varchar(150)')
        ->and($columns['is_active']['default'])->toBe('1')
        ->and($columns['must_change_password']['nullable'])->toBeFalse()
        ->and($columns['is_protected_superadmin']['default'])->toBe('0')
        ->and(Schema::foreignKeys('users'))->toBe(['team_id' => ['teams', 'id', 'RESTRICT']])
        ->and(Schema::indexes('users'))->toContain(['team_id']);
});

it('rejects duplicate usernames regardless of case and unknown Team references', function (): void {
    SchemaFixtures::user('example.user');

    expect(Schema::rejects(fn () => SchemaFixtures::user('Example.User')))->toBeTrue()
        ->and(Schema::rejects(fn () => SchemaFixtures::user('orphan.user', 999_999)))->toBeTrue();
});

it('refuses to delete a Team that users still reference', function (): void {
    $teamId = SchemaFixtures::team();
    SchemaFixtures::user('member.user', $teamId);

    expect(Schema::rejects(fn () => DB::table('teams')->where('id', $teamId)->delete()))->toBeTrue();
});

it('drops the unused email password-reset table', function (): void {
    expect(Schema::tableExists('password_reset_tokens'))->toBeFalse();
});
