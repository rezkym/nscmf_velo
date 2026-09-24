<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-9 (11 §25–29): Change repeatable collections; results never carry planning fields.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_change_facing_challenges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('challenge_text', 1000)->nullable();
            $table->unique(['nscmf_record_id', 'row_no']);
        });

        Schema::create('nscmf_change_identified_problems', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('problem_text', 1000)->nullable();
            $table->unique(['nscmf_record_id', 'row_no']);
        });

        Schema::create('nscmf_change_service_impacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->string('impact_code', 16);
            $table->string('other_description', 500)->nullable();
            $table->unique(['nscmf_record_id', 'impact_code']);
        });

        Schema::create('nscmf_change_improvement_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('plan_text', 1000)->nullable();
            $table->string('target_kpi', 1000)->nullable();
            $table->unique(['nscmf_record_id', 'row_no']);
        });

        Schema::create('nscmf_change_results', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('result_summary', 2000)->nullable();
            $table->string('performance_information', 2000)->nullable();
            $table->string('result_status', 255)->nullable();
            $table->timestamps();
            $table->unique(['nscmf_record_id', 'row_no']);
        });

        foreach (['nscmf_change_facing_challenges', 'nscmf_change_identified_problems', 'nscmf_change_improvement_items'] as $table) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_row_no_check CHECK (row_no BETWEEN 1 AND 3)");
        }

        DB::statement('ALTER TABLE nscmf_change_results ADD CONSTRAINT nscmf_change_results_row_no_check CHECK (row_no BETWEEN 1 AND 5)');
        DB::statement("ALTER TABLE nscmf_change_service_impacts ADD CONSTRAINT nscmf_change_impact_code_check
            CHECK (impact_code COLLATE utf8mb4_bin IN ('NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_change_results');
        Schema::dropIfExists('nscmf_change_improvement_items');
        Schema::dropIfExists('nscmf_change_service_impacts');
        Schema::dropIfExists('nscmf_change_identified_problems');
        Schema::dropIfExists('nscmf_change_facing_challenges');
    }
};
