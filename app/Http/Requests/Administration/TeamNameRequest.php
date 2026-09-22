<?php

declare(strict_types=1);

namespace App\Http\Requests\Administration;

use App\Http\Requests\AllowlistedRequest;
use Illuminate\Validation\Rule;

final class TeamNameRequest extends AllowlistedRequest
{
    protected function anyPermission(): array
    {
        return $this->routeIs('administration.teams.store') ? ['teams.create'] : ['teams.update'];
    }

    protected function allowedKeys(): array
    {
        return ['name'];
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $team = $this->route('team');

        return [
            // The ai_ci collation makes this uniqueness check case-insensitive (11 §8).
            'name' => ['required', 'string', 'max:150', Rule::unique('teams', 'name')->ignore(is_numeric($team) ? (int) $team : null)],
        ];
    }
}
