<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-11 (11 §34–38): Business, Access and Security Audit, physically separate and
 * append-oriented. There is deliberately no deleted_at/expiry/retention column: these
 * rows are never age-purged. Attachment/export FKs are added when those tables exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->foreignId('workflow_iteration_id')->nullable()->constrained('nscmf_workflow_iterations')->restrictOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('actor_type', 16);
            $table->string('event_type', 64);
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32)->nullable();
            $table->string('reason', 2000)->nullable();
            $table->string('comment', 2000)->nullable();
            $table->unsignedBigInteger('record_version_before')->nullable();
            $table->unsignedBigInteger('record_version_after')->nullable();
            $table->json('metadata_json')->nullable();
            $table->dateTime('occurred_at', 6);

            $table->index(['nscmf_record_id', 'occurred_at']);
            $table->index(['actor_user_id', 'occurred_at']);
            $table->index(['event_type', 'occurred_at']);
        });

        Schema::create('business_audit_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('business_audit_event_id')->constrained('business_audit_events')->restrictOnDelete();
            $table->string('field_path', 255);
            $table->string('value_kind', 32)->nullable();
            $table->longText('old_value_text')->nullable();
            $table->longText('new_value_text')->nullable();
        });

        Schema::create('access_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_user_id')->constrained('users')->restrictOnDelete();
            $table->string('event_type', 64);
            $table->foreignId('nscmf_record_id')->nullable()->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedBigInteger('attachment_id')->nullable()->index();
            $table->unsignedBigInteger('export_request_id')->nullable()->index();
            $table->dateTime('occurred_at', 6);

            $table->index(['actor_user_id', 'occurred_at']);
            $table->index(['nscmf_record_id', 'occurred_at']);
        });

        Schema::create('security_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('subject_username', 150)->nullable();
            $table->string('event_type', 64);
            $table->string('outcome', 16);
            $table->string('session_id', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->foreignId('nscmf_record_id')->nullable()->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedBigInteger('attachment_id')->nullable()->index();
            $table->unsignedBigInteger('export_request_id')->nullable()->index();
            $table->json('metadata_json')->nullable();
            $table->dateTime('occurred_at', 6);

            $table->index(['event_type', 'occurred_at']);
            $table->index(['actor_user_id', 'occurred_at']);
            $table->index(['target_user_id', 'occurred_at']);
        });

        DB::statement("ALTER TABLE business_audit_events ADD CONSTRAINT business_audit_actor_type_check
            CHECK (actor_type COLLATE utf8mb4_bin IN ('USER', 'SYSTEM'))");
        DB::statement("ALTER TABLE security_audit_events ADD CONSTRAINT security_audit_outcome_check
            CHECK (outcome COLLATE utf8mb4_bin IN ('SUCCESS', 'FAILURE', 'DENIED', 'ERROR'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('security_audit_events');
        Schema::dropIfExists('access_audit_events');
        Schema::dropIfExists('business_audit_changes');
        Schema::dropIfExists('business_audit_events');
    }
};
