<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Reference data only. The Protected Superadmin is bootstrapped by the operator through
 * `php artisan nscmf:bootstrap-superadmin` (17 §23); demo data is never seeded here.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ReferenceDataSeeder::class);
    }
}
