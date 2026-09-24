<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-3 (11 §12): typed singleton for the protected Technical Log cleanup setting.
 * The id is not auto-incremented so CHECK (id = 1) can make the "exactly one effective row" invariant database-enforced.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table): void {
            $table->unsignedBigInteger('id')->primary();
            $table->boolean('technical_log_auto_cleanup_enabled')->default(true);
            $table->unsignedInteger('technical_log_retention_value')->default(30);
            $table->string('technical_log_retention_unit', 8)->default('DAY');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE system_settings
            ADD CONSTRAINT system_settings_singleton_check CHECK (id = 1),
            ADD CONSTRAINT system_settings_retention_value_check CHECK (technical_log_retention_value >= 1),
            ADD CONSTRAINT system_settings_retention_unit_check CHECK (technical_log_retention_unit COLLATE utf8mb4_bin IN (\'DAY\', \'MONTH\'))');
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
