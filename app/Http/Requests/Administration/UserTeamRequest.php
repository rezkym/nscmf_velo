<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

/** Exactly {team_id} naming an active Team (12 §87). */
final class UserTeamRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return ['users.assign_team', 'teams.assign_users'];
    }

    protected function allowedKeys(): array
    {
        return ['team_id'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return ['team_id' => ['required', 'integer', Rule::exists('teams', 'id')->where('is_active', true)]];
    }
}
