<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * T05-14 (11 §50): explicit anchor for the 8-hour absolute session lifetime and for
 * deterministic oldest-session revocation on a third valid login.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table): void {
            $table->dateTime('authenticated_at', 6)->nullable()->after('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table): void {
            $table->dropIndex(['authenticated_at']);
            $table->dropColumn('authenticated_at');
        });
    }
};
