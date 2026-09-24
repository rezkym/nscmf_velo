<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-12 (11 §39–40, 11A §23–24): final attachments and resumable upload transport metadata.
 * Upload status (transport) and security status (malware) live in different tables; chunk
 * metadata cascades with its temporary session but never with the NSCMF record or audits.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('original_filename', 255);
            $table->string('extension', 16);
            $table->string('detected_mime_type', 150);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->string('quarantine_object_key', 1024)->nullable();
            $table->string('private_object_key', 1024)->nullable();
            $table->string('security_status', 16);
            $table->dateTime('scanned_at', 6)->nullable();
            $table->string('scanner_engine', 100)->nullable();
            $table->dateTime('removed_at', 6)->nullable();
            $table->foreignId('removed_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['nscmf_record_id', 'removed_at']);
        });

        Schema::create('nscmf_attachment_upload_sessions', function (Blueprint $table): void {
            $table->id();
            $table->char('public_id', 26)->unique();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->foreignId('initiated_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('original_filename', 255);
            $table->string('normalized_extension', 16);
            $table->string('client_declared_mime', 150)->nullable();
            $table->unsignedBigInteger('expected_size_bytes');
            $table->unsignedInteger('chunk_size_bytes');
            $table->unsignedInteger('expected_chunk_count');
            $table->char('client_fingerprint_sha256', 64)->nullable();
            $table->string('upload_status', 16);
            $table->dateTime('last_activity_at', 6);
            $table->dateTime('expires_at', 6);
            $table->string('assembly_storage_key', 1024)->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->foreignId('attachment_id')->nullable()->constrained('nscmf_attachments')->restrictOnDelete();
            $table->timestamps();

            $table->index(['upload_status', 'expires_at']);
            $table->index(['nscmf_record_id', 'upload_status'], 'nscmf_upload_sessions_record_status_index');
        });

        Schema::create('nscmf_attachment_upload_chunks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('upload_session_id')->constrained('nscmf_attachment_upload_sessions')->cascadeOnDelete();
            $table->unsignedInteger('chunk_index');
            $table->unsignedInteger('size_bytes');
            $table->string('storage_key', 1024);
            $table->char('chunk_sha256', 64)->nullable();
            $table->dateTime('accepted_at', 6);
            $table->timestamp('created_at')->nullable();

            $table->unique(['upload_session_id', 'chunk_index'], 'nscmf_upload_chunks_session_index_unique');
            $table->index(['upload_session_id', 'accepted_at'], 'nscmf_upload_chunks_session_accepted_index');
        });

        DB::statement("ALTER TABLE nscmf_attachments
            ADD CONSTRAINT nscmf_attachments_security_status_check CHECK (security_status COLLATE utf8mb4_bin IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')),
            ADD CONSTRAINT nscmf_attachments_size_check CHECK (size_bytes > 0)");
        DB::statement("ALTER TABLE nscmf_attachment_upload_sessions
            ADD CONSTRAINT nscmf_upload_status_check CHECK (upload_status COLLATE utf8mb4_bin IN
                ('UPLOADING', 'ASSEMBLING', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED')),
            ADD CONSTRAINT nscmf_upload_expected_size_check CHECK (expected_size_bytes > 0),
            ADD CONSTRAINT nscmf_upload_chunk_count_check CHECK (expected_chunk_count >= 1)");
        DB::statement('ALTER TABLE nscmf_attachment_upload_chunks
            ADD CONSTRAINT nscmf_upload_chunk_index_check CHECK (chunk_index >= 1)');

        foreach (['access_audit_events', 'security_audit_events'] as $audit) {
            Schema::table($audit, function (Blueprint $table): void {
                $table->foreign('attachment_id')->references('id')->on('nscmf_attachments')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['access_audit_events', 'security_audit_events'] as $audit) {
            Schema::table($audit, function (Blueprint $table): void {
                $table->dropForeign(['attachment_id']);
            });
        }

        Schema::dropIfExists('nscmf_attachment_upload_chunks');
        Schema::dropIfExists('nscmf_attachment_upload_sessions');
        Schema::dropIfExists('nscmf_attachments');
    }
};
