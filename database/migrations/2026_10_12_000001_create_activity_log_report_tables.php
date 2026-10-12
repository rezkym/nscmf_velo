<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * T82A / G26 (11 §36, §41, §44A): template kinds, the Activity Log report export with its
 * immutable snapshot, progress and private artifact, and the Access Audit link to it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nscmf_template_versions', function (Blueprint $table): void {
            $table->string('template_kind', 32)->default('NSCMF_FORM')->after('mapping_version');
            $table->index(['template_kind', 'is_active']);
        });
        DB::statement("ALTER TABLE nscmf_template_versions ADD CONSTRAINT nscmf_template_kind_check CHECK (template_kind COLLATE utf8mb4_bin IN ('NSCMF_FORM', 'ACTIVITY_LOG'))");

        Schema::create('nscmf_activity_log_exports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('requested_by_user_id')->constrained('users')->restrictOnDelete();
            $table->string('format', 8);
            $table->string('status', 16);
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->foreignId('template_version_id')->constrained('nscmf_template_versions')->restrictOnDelete();
            $table->string('snapshot_schema_version', 50);
            $table->json('snapshot_json');
            $table->char('snapshot_sha256', 64);
            $table->unsignedInteger('entry_count');
            $table->dateTime('requested_at', 6);
            $table->dateTime('started_at', 6)->nullable();
            $table->dateTime('ready_at', 6)->nullable();
            $table->dateTime('failed_at', 6)->nullable();
            $table->dateTime('expires_at', 6)->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->string('failure_summary', 1000)->nullable();
            $table->string('private_object_key', 1024)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->char('artifact_sha256', 64)->nullable();
            $table->dateTime('binary_purged_at', 6)->nullable();

            $table->index(['requested_by_user_id', 'requested_at'], 'activity_log_exports_requester_index');
            $table->index(['status', 'requested_at'], 'activity_log_exports_status_index');
            $table->index(['expires_at', 'binary_purged_at'], 'activity_log_exports_expiry_index');
        });
        DB::statement("ALTER TABLE nscmf_activity_log_exports
            ADD CONSTRAINT nscmf_activity_log_format_check CHECK (format COLLATE utf8mb4_bin IN ('XLSX', 'PDF')),
            ADD CONSTRAINT nscmf_activity_log_status_check CHECK (status COLLATE utf8mb4_bin IN ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED')),
            ADD CONSTRAINT nscmf_activity_log_progress_check CHECK (progress_percent <= 100),
            ADD CONSTRAINT nscmf_activity_log_entries_check CHECK (entry_count BETWEEN 1 AND 1000)");

        Schema::table('access_audit_events', function (Blueprint $table): void {
            $table->foreignId('activity_log_export_id')->nullable()->after('export_request_id')
                ->constrained('nscmf_activity_log_exports')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('access_audit_events', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('activity_log_export_id');
        });
        Schema::dropIfExists('nscmf_activity_log_exports');
        DB::statement('ALTER TABLE nscmf_template_versions DROP CHECK nscmf_template_kind_check');
        Schema::table('nscmf_template_versions', function (Blueprint $table): void {
            $table->dropIndex(['template_kind', 'is_active']);
            $table->dropColumn('template_kind');
        });
    }
};
