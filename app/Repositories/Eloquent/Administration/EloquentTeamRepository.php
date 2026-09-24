<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Administration;

use App\Models\Team;
use App\Repositories\Contracts\Administration\TeamRepository;
use Illuminate\Support\Collection;

final class EloquentTeamRepository implements TeamRepository
{
    public function all(): Collection
    {
        return Team::query()->orderBy('name')->get();
    }

    public function active(): Collection
    {
        return Team::query()->where('is_active', true)->orderBy('name')->get();
    }

    public function find(int $id): ?Team
    {
        return Team::query()->find($id);
    }

    public function lockForUpdate(int $id): ?Team
    {
        return Team::query()->lockForUpdate()->find($id);
    }

    public function create(string $name): Team
    {
        return Team::query()->create(['name' => $name, 'is_active' => true]);
    }

    public function update(Team $team, array $attributes): void
    {
        $team->forceFill($attributes)->save();
    }

    public function hasActiveTeam(): bool
    {
        return Team::query()->where('is_active', true)->exists();
    }
}
