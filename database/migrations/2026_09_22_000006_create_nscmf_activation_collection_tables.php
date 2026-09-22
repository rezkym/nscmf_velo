<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-6 (11 §17–21): Activation repeatable collections keyed by their natural keys.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_activation_references', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->string('reference_type', 16);
            $table->string('specification', 255)->nullable();
            $table->unique(['nscmf_record_id', 'reference_type'], 'nscmf_act_references_record_type_unique');
        });

        Schema::create('nscmf_activation_service_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->string('service_context', 16);
            $table->string('service_id', 100)->nullable();
            $table->string('service_status', 16)->nullable();
            $table->string('service_description', 2000)->nullable();
            $table->string('service_location', 500)->nullable();
            $table->timestamps();
            $table->unique(['nscmf_record_id', 'service_context'], 'nscmf_act_service_blocks_record_context_unique');
        });

        Schema::create('nscmf_activation_sla_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('requirement_text', 1000)->nullable();
            $table->unique(['nscmf_record_id', 'row_no']);
        });

        Schema::create('nscmf_activation_virtual_connections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->decimal('bandwidth_mbps', 14, 3)->nullable();
            $table->unique(['nscmf_record_id', 'row_no'], 'nscmf_act_virtual_connections_record_row_unique');
        });

        Schema::create('nscmf_activation_priority_destinations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedTinyInteger('row_no');
            $table->string('destination', 255)->nullable();
            $table->unique(['nscmf_record_id', 'row_no'], 'nscmf_act_priority_destinations_record_row_unique');
        });

        DB::statement("ALTER TABLE nscmf_activation_references ADD CONSTRAINT nscmf_activation_reference_type_check
            CHECK (reference_type COLLATE utf8mb4_bin IN ('IWO', 'VELOSHIP', 'TICKET', 'OTHER'))");
        DB::statement("ALTER TABLE nscmf_activation_service_blocks
            ADD CONSTRAINT nscmf_activation_service_context_check CHECK (service_context COLLATE utf8mb4_bin IN ('EXISTING', 'NEW')),
            ADD CONSTRAINT nscmf_activation_service_status_check CHECK (service_status IS NULL OR service_status COLLATE utf8mb4_bin IN ('ACTIVATED', 'DEACTIVATED'))");

        foreach (['nscmf_activation_sla_items', 'nscmf_activation_virtual_connections', 'nscmf_activation_priority_destinations'] as $table) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_row_no_check CHECK (row_no BETWEEN 1 AND 3)");
        }

        DB::statement('ALTER TABLE nscmf_activation_virtual_connections ADD CONSTRAINT nscmf_activation_vc_bandwidth_check
            CHECK (bandwidth_mbps IS NULL OR bandwidth_mbps > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_activation_priority_destinations');
        Schema::dropIfExists('nscmf_activation_virtual_connections');
        Schema::dropIfExists('nscmf_activation_sla_items');
        Schema::dropIfExists('nscmf_activation_service_blocks');
        Schema::dropIfExists('nscmf_activation_references');
    }
};
