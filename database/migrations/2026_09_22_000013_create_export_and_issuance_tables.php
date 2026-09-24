<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T05-13 (11 §41–48): template versions, exports, immutable snapshots, artifacts, public
 * signing certificates and PDF issuances. There is intentionally no private-key column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nscmf_template_versions', function (Blueprint $table): void {
            $table->id();
            $table->string('version_label', 50)->unique();
            $table->string('private_object_key', 1024);
            $table->char('template_sha256', 64)->unique();
            $table->string('mapping_version', 100);
            $table->boolean('is_active')->default(false);
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('nscmf_export_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('format', 8);
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('nscmf_export_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('export_batch_id')->nullable()->constrained('nscmf_export_batches')->restrictOnDelete();
            $table->string('format', 8);
            $table->string('status', 16);
            $table->dateTime('requested_at', 6);
            $table->dateTime('started_at', 6)->nullable();
            $table->dateTime('ready_at', 6)->nullable();
            $table->dateTime('failed_at', 6)->nullable();
            $table->dateTime('expires_at', 6)->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->string('failure_summary', 1000)->nullable();

            $table->index(['nscmf_record_id', 'requested_at']);
            $table->index(['requested_by_user_id', 'requested_at']);
            $table->index(['status', 'requested_at']);
            $table->index('expires_at');
        });

        Schema::create('nscmf_export_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('export_request_id')->unique()->constrained('nscmf_export_requests')->restrictOnDelete();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->unsignedBigInteger('record_version');
            $table->foreignId('workflow_iteration_id')->nullable()->constrained('nscmf_workflow_iterations')->restrictOnDelete();
            $table->foreignId('template_version_id')->constrained('nscmf_template_versions')->restrictOnDelete();
            $table->string('snapshot_schema_version', 50);
            $table->json('snapshot_json');
            $table->char('snapshot_sha256', 64);
            $table->dateTime('created_at', 6);
        });

        Schema::create('nscmf_export_artifacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('export_request_id')->unique()->constrained('nscmf_export_requests')->restrictOnDelete();
            $table->string('private_object_key', 1024)->nullable();
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->char('artifact_sha256', 64);
            $table->dateTime('created_at', 6);
            $table->dateTime('expires_at', 6);
            $table->dateTime('binary_purged_at', 6)->nullable();

            $table->index(['expires_at', 'binary_purged_at']);
        });

        Schema::create('nscmf_signing_certificates', function (Blueprint $table): void {
            $table->id();
            $table->string('certificate_label', 150);
            $table->char('fingerprint_sha256', 64)->unique();
            $table->string('serial_number', 255)->nullable();
            $table->string('subject_dn', 1000)->nullable();
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->string('material_format', 32)->nullable();
            $table->mediumText('public_certificate_material')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('created_at')->nullable();
            $table->timestamp('retired_at')->nullable();
        });

        Schema::create('nscmf_pdf_issuances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('export_request_id')->unique()->constrained('nscmf_export_requests')->restrictOnDelete();
            $table->foreignId('export_artifact_id')->unique()->constrained('nscmf_export_artifacts')->restrictOnDelete();
            $table->foreignId('nscmf_record_id')->constrained('nscmf_records')->restrictOnDelete();
            $table->foreignId('export_snapshot_id')->constrained('nscmf_export_snapshots')->restrictOnDelete();
            $table->foreignId('workflow_iteration_id')->constrained('nscmf_workflow_iterations')->restrictOnDelete();
            $table->foreignId('signing_certificate_id')->constrained('nscmf_signing_certificates')->restrictOnDelete();
            $table->char('final_pdf_sha256', 64)->index();
            $table->dateTime('issued_at', 6);

            $table->index(['nscmf_record_id', 'workflow_iteration_id']);
        });

        DB::statement("ALTER TABLE nscmf_export_batches ADD CONSTRAINT nscmf_export_batch_format_check CHECK (format COLLATE utf8mb4_bin IN ('XLSX', 'PDF'))");
        DB::statement("ALTER TABLE nscmf_export_requests
            ADD CONSTRAINT nscmf_export_format_check CHECK (format COLLATE utf8mb4_bin IN ('XLSX', 'PDF')),
            ADD CONSTRAINT nscmf_export_status_check CHECK (status COLLATE utf8mb4_bin IN ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED'))");

        foreach (['access_audit_events', 'security_audit_events'] as $audit) {
            Schema::table($audit, function (Blueprint $table): void {
                $table->foreign('export_request_id')->references('id')->on('nscmf_export_requests')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['access_audit_events', 'security_audit_events'] as $audit) {
            Schema::table($audit, function (Blueprint $table): void {
                $table->dropForeign(['export_request_id']);
            });
        }

        Schema::dropIfExists('nscmf_pdf_issuances');
        Schema::dropIfExists('nscmf_signing_certificates');
        Schema::dropIfExists('nscmf_export_artifacts');
        Schema::dropIfExists('nscmf_export_snapshots');
        Schema::dropIfExists('nscmf_export_requests');
        Schema::dropIfExists('nscmf_export_batches');
        Schema::dropIfExists('nscmf_template_versions');
    }
};
