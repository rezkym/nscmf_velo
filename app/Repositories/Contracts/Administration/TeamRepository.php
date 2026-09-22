<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\Team;
use Illuminate\Support\Collection;

interface TeamRepository
{
    /**
     * @return Collection<int, Team>
     */
    public function all(): Collection;

    /**
     * @return Collection<int, Team>
     */
    public function active(): Collection;

    public function find(int $id): ?Team;

    public function lockForUpdate(int $id): ?Team;

    public function create(string $name): Team;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Team $team, array $attributes): void;

    public function hasActiveTeam(): bool;
}
