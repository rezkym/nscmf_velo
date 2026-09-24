<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * T05-1 (11 §8–9): Team as organizational metadata and the username-based user identity.
 * The utf8mb4_0900_ai_ci collation makes both unique indexes case-insensitive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['email']);
            $table->dropColumn(['email', 'email_verified_at']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('team_id')->nullable()->after('id')->constrained('teams')->restrictOnDelete();
            $table->string('name', 150)->change();
            $table->string('username', 150)->unique()->after('name');
            $table->boolean('is_active')->default(true)->after('password');
            $table->boolean('must_change_password')->default(false)->after('is_active');
            $table->boolean('is_protected_superadmin')->default(false)->after('must_change_password');
            $table->timestamp('password_changed_at')->nullable()->after('is_protected_superadmin');
        });

        Schema::dropIfExists('password_reset_tokens');
    }

    public function down(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('team_id');
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'is_active', 'must_change_password', 'is_protected_superadmin', 'password_changed_at']);
            $table->string('email')->unique()->after('name');
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });

        Schema::dropIfExists('teams');
    }
};
