<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sales')) {
            return;
        }

        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'recorded_at')) {
                $table->timestamp('recorded_at')->nullable()->after('created_at');
                $table->index('recorded_at');
            }
        });

        DB::table('sales')
            ->whereNull('recorded_at')
            ->update([
                'recorded_at' => DB::raw('COALESCE(updated_at, created_at)'),
            ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales')) {
            return;
        }

        Schema::table('sales', function (Blueprint $table) {
            if (Schema::hasColumn('sales', 'recorded_at')) {
                $table->dropIndex(['recorded_at']);
                $table->dropColumn('recorded_at');
            }
        });
    }
};
