<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-7 (11 §22–23): optional Customer Site blocks, 1:1 with the Activation record.
 * No RSSI range is invented.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_activation_direct_site_details', function (Blueprint $table): void {
            $table->foreignId('nscmf_record_id')->primary()->constrained('nscmf_records')->restrictOnDelete();
            $table->string('local_loops', 255)->nullable();
            $table->string('lastmile', 255)->nullable();
            $table->string('bwa', 255)->nullable();
            $table->string('antenna_tower', 255)->nullable();
            $table->string('direction', 255)->nullable();
            $table->decimal('rssi', 12, 3)->nullable();
            $table->decimal('latency_ms', 14, 3)->nullable();
            $table->decimal('packet_loss_percent', 5, 2)->nullable();
            $table->string('routers', 255)->nullable();
            $table->string('ups', 255)->nullable();
            $table->string('stabilizer', 255)->nullable();
            $table->string('cable', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('nscmf_activation_pop_site_details', function (Blueprint $table): void {
            $table->foreignId('nscmf_record_id')->primary()->constrained('nscmf_records')->restrictOnDelete();
            $table->string('switch_distribution', 255)->nullable();
            $table->string('port', 255)->nullable();
            $table->unsignedSmallInteger('vlan_id')->nullable();
            $table->string('local_loops', 255)->nullable();
            $table->string('routers', 255)->nullable();
            $table->string('cpe_indoor', 255)->nullable();
            $table->string('cpe_outdoor', 255)->nullable();
            $table->timestamps();
        });

        DB::statement('ALTER TABLE nscmf_activation_direct_site_details
            ADD CONSTRAINT nscmf_direct_site_latency_check CHECK (latency_ms IS NULL OR latency_ms >= 0),
            ADD CONSTRAINT nscmf_direct_site_packet_loss_check CHECK (packet_loss_percent IS NULL OR packet_loss_percent BETWEEN 0 AND 100)');
        DB::statement('ALTER TABLE nscmf_activation_pop_site_details
            ADD CONSTRAINT nscmf_pop_site_vlan_check CHECK (vlan_id IS NULL OR vlan_id BETWEEN 1 AND 4094)');
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_activation_pop_site_details');
        Schema::dropIfExists('nscmf_activation_direct_site_details');
    }
};
