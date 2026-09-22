<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-8 (11 §24): Change core, 1:1 with its record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_change_details', function (Blueprint $table): void {
            $table->foreignId('nscmf_record_id')->primary()->constrained('nscmf_records')->restrictOnDelete();
            $table->string('maintenance_purpose', 4000)->nullable();
            $table->date('target_execution_date')->nullable();
            $table->decimal('monitoring_period_value', 14, 3)->nullable();
            $table->string('monitoring_period_unit', 32)->nullable();
            $table->string('rollback_scenario', 4000)->nullable();
            $table->string('announcement_timing', 40)->nullable();
            $table->timestamps();
        });

        DB::statement("ALTER TABLE nscmf_change_details
            ADD CONSTRAINT nscmf_change_announcement_check CHECK (announcement_timing IS NULL
                OR announcement_timing COLLATE utf8mb4_bin IN ('ONE_WEEK_BEFORE', 'TWO_WEEKS_BEFORE', 'TWO_DAYS_BEFORE_EMERGENCY')),
            ADD CONSTRAINT nscmf_change_monitoring_unit_check CHECK (monitoring_period_unit IS NULL
                OR monitoring_period_unit COLLATE utf8mb4_bin IN ('MINUTE', 'HOUR', 'DAY', 'WEEK')),
            ADD CONSTRAINT nscmf_change_monitoring_pair_check CHECK ((monitoring_period_value IS NULL) = (monitoring_period_unit IS NULL)),
            ADD CONSTRAINT nscmf_change_monitoring_value_check CHECK (monitoring_period_value IS NULL OR monitoring_period_value > 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_change_details');
    }
};
