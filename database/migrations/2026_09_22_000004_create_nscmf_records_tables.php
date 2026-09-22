<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-4 (11 §13–15): the NSCMF record and the global monthly number sequence.
 * Closed sets compare with utf8mb4_bin so only the exact uppercase wire values pass.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_records', function (Blueprint $table): void {
            $table->id();
            $table->string('request_no', 64);
            $table->string('request_no_normalized', 64)->unique();
            $table->string('numbering_mode', 16);
            $table->string('family', 16);
            $table->string('subtype', 32);
            $table->date('request_date')->nullable();
            $table->foreignId('owner_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('team_id')->constrained('teams')->restrictOnDelete();
            $table->string('business_status', 32);
            $table->unsignedBigInteger('record_version')->default(1);
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('first_submitted_at', 6)->nullable();
            $table->unsignedBigInteger('current_workflow_iteration_id')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->dateTime('archived_at', 6)->nullable();
            $table->foreignId('archived_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('archive_reason', 2000)->nullable();
            $table->timestamps();

            $table->index(['owner_user_id', 'business_status']);
            $table->index(['business_status', 'is_archived']);
            $table->index(['family', 'subtype']);
            $table->index('request_date');
            $table->index('created_at');
        });

        DB::statement("ALTER TABLE nscmf_records
            ADD CONSTRAINT nscmf_records_business_status_check CHECK (business_status COLLATE utf8mb4_bin IN
                ('DRAFT', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'CANCELLED')),
            ADD CONSTRAINT nscmf_records_numbering_mode_check CHECK (numbering_mode COLLATE utf8mb4_bin IN ('AUTOMATIC', 'MANUAL')),
            ADD CONSTRAINT nscmf_records_family_subtype_check CHECK (
                (family COLLATE utf8mb4_bin = 'ACTIVATION' AND subtype COLLATE utf8mb4_bin IN ('ACTIVATION', 'UPGRADE_DOWNGRADE', 'DEACTIVATION'))
                OR (family COLLATE utf8mb4_bin = 'CHANGE' AND subtype COLLATE utf8mb4_bin IN ('MAINTENANCE', 'UPGRADE', 'EMERGENCY'))),
            ADD CONSTRAINT nscmf_records_archive_status_check CHECK (
                is_archived = 0 OR business_status COLLATE utf8mb4_bin IN ('APPROVED', 'REJECTED', 'CANCELLED')),
            ADD CONSTRAINT nscmf_records_record_version_check CHECK (record_version >= 1)");

        Schema::create('nscmf_number_sequences', function (Blueprint $table): void {
            $table->char('year_month', 6)->primary();
            $table->unsignedInteger('last_value');
            $table->timestamp('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nscmf_number_sequences');
        Schema::dropIfExists('nscmf_records');
    }
};
