<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-10 (11 §30–33): workflow iterations and their sign-offs. No reviewer/approver
 * assignment table exists. A functional unique index keeps at most one open (not yet
 * closed) iteration per record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_workflow_iterations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedInteger('iteration_no');
            $table->foreignId('predecessor_iteration_id')->nullable()->constrained('nscmf_workflow_iterations')->restrictOnDelete();
            $table->string('started_via', 16);
            $table->foreignId('started_by_user_id')->constrained('users')->restrictOnDelete();
            $table->dateTime('started_at', 6);
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('reviewed_at', 6)->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('approved_at', 6)->nullable();
            $table->string('closed_status', 16)->nullable();
            $table->dateTime('closed_at', 6)->nullable();
            $table->dateTime('superseded_at', 6)->nullable();
            $table->timestamps();

            $table->unique(['nscmf_record_id', 'iteration_no']);
            $table->index(['nscmf_record_id', 'closed_status']);
            $table->index('approved_at');
        });

        DB::statement("ALTER TABLE nscmf_workflow_iterations
            ADD CONSTRAINT nscmf_iteration_no_check CHECK (iteration_no >= 1),
            ADD CONSTRAINT nscmf_iteration_started_via_check CHECK (started_via COLLATE utf8mb4_bin IN ('FIRST_SUBMIT', 'REOPEN')),
            ADD CONSTRAINT nscmf_iteration_closed_status_check CHECK (closed_status IS NULL OR closed_status COLLATE utf8mb4_bin IN ('APPROVED', 'REJECTED')),
            ADD CONSTRAINT nscmf_iteration_closed_pair_check CHECK ((closed_status IS NULL) = (closed_at IS NULL)),
            ADD CONSTRAINT nscmf_iteration_approval_check CHECK (
                (approved_by_user_id IS NULL AND approved_at IS NULL)
                OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL AND closed_status IS NOT NULL AND closed_status COLLATE utf8mb4_bin = 'APPROVED')),
            ADD CONSTRAINT nscmf_iteration_approved_signoff_check CHECK (
                closed_status IS NULL OR closed_status COLLATE utf8mb4_bin <> 'APPROVED' OR approved_by_user_id IS NOT NULL)");

        DB::statement('CREATE UNIQUE INDEX nscmf_iterations_one_open_unique ON nscmf_workflow_iterations
            ((CASE WHEN closed_status IS NULL THEN nscmf_record_id END))');

        Schema::table('nscmf_records', function (Blueprint $table): void {
            $table->foreign('current_workflow_iteration_id')->references('id')->on('nscmf_workflow_iterations')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('nscmf_records', function (Blueprint $table): void {
            $table->dropForeign(['current_workflow_iteration_id']);
        });

        Schema::dropIfExists('nscmf_workflow_iterations');
    }
};
