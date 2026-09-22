<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * Username-based identity (11 §9). Team is organizational metadata; permissions come from
 * Spatie roles only.
 *
 * @property int $id
 * @property int|null $team_id
 * @property string $name
 * @property string $username
 * @property string $password
 * @property bool $is_active
 * @property bool $must_change_password
 * @property bool $is_protected_superadmin
 * @property-read Team|null $team
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles;

    protected string $guard_name = 'web';

    protected $fillable = [
        'team_id',
        'name',
        'username',
        'password',
        'is_active',
        'must_change_password',
        'is_protected_superadmin',
        'password_changed_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'is_protected_superadmin' => 'boolean',
            'password_changed_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
