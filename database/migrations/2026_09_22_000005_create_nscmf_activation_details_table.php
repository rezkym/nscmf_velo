<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-5 (11 §16): Activation core, 1:1 with its record; Draft fields stay nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_activation_details', function (Blueprint $table): void {
            $table->foreignId('nscmf_record_id')->primary()->constrained('nscmf_records')->restrictOnDelete();
            $table->string('customer_name', 150)->nullable();
            $table->string('contact_name', 150)->nullable();
            $table->date('installation_rfs_date')->nullable();
            $table->text('lan_ip_allocation')->nullable();
            $table->string('wan_ip', 255)->nullable();
            $table->string('gateway', 255)->nullable();
            $table->string('pop', 255)->nullable();
            $table->string('regional', 255)->nullable();
            $table->string('preferred_upstream', 255)->nullable();
            $table->string('secondary_upstream', 255)->nullable();
            $table->string('primary_noc_link', 255)->nullable();
            $table->string('secondary_noc_link', 255)->nullable();
            $table->string('downlink_router', 255)->nullable();
            $table->decimal('bandwidth_international_mbps', 14, 3)->nullable();
            $table->decimal('bandwidth_domestic_iix_mbps', 14, 3)->nullable();
            $table->decimal('bandwidth_mixed_mbps', 14, 3)->nullable();
            $table->string('domain_name_1', 253)->nullable();
            $table->string('domain_name_2', 253)->nullable();
            $table->string('primary_dns', 255)->nullable();
            $table->string('secondary_dns', 255)->nullable();
            $table->string('mx_primary', 255)->nullable();
            $table->string('mx_secondary', 255)->nullable();
            $table->string('hosting_platform', 255)->nullable();
            $table->decimal('hosting_capacity_gb', 14, 3)->nullable();
            $table->boolean('migrate_domain')->default(false);
            $table->boolean('migrate_hosting')->default(false);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE nscmf_activation_details
            ADD CONSTRAINT nscmf_activation_bw_international_check CHECK (bandwidth_international_mbps IS NULL OR bandwidth_international_mbps > 0),
            ADD CONSTRAINT nscmf_activation_bw_domestic_check CHECK (bandwidth_domestic_iix_mbps IS NULL OR bandwidth_domestic_iix_mbps > 0),
            ADD CONSTRAINT nscmf_activation_bw_mixed_check CHECK (bandwidth_mixed_mbps IS NULL OR bandwidth_mixed_mbps > 0),
            ADD CONSTRAINT nscmf_activation_hosting_capacity_check CHECK (hosting_capacity_gb IS NULL OR hosting_capacity_gb > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_activation_details');
    }
};
