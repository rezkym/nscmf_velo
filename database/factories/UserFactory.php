<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Test/development builder only (17 §6); never production reference data.
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => 'user.'.Str::lower(Str::random(10)),
            'password' => 'secret-pass',
            'is_active' => true,
            'must_change_password' => false,
            'is_protected_superadmin' => false,
        ];
    }
}
