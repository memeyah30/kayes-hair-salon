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

        if (!Schema::hasColumn('managers', 'image')) {
            Schema::table('managers', function (Blueprint $table) {
                $table->string('image')->nullable()->after('active');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('managers')) {
            return;
        }

        if (Schema::hasColumn('managers', 'image')) {
            Schema::table('managers', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }
    }
};

