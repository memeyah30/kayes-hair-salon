<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('managers')) {
            return;
        }

        if (!Schema::hasColumn('managers', 'active')) {
            Schema::table('managers', function (Blueprint $table) {
                $table->boolean('active')->default(true)->after('password');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('managers')) {
            return;
        }

        if (Schema::hasColumn('managers', 'active')) {
            Schema::table('managers', function (Blueprint $table) {
                $table->dropColumn('active');
            });
        }
    }
};
