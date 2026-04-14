<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('appointments') || !Schema::hasColumn('appointments', 'stylist_id')) {
            return;
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('stylist_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('appointments') || !Schema::hasColumn('appointments', 'stylist_id')) {
            return;
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('stylist_id')->nullable(false)->change();
        });
    }
};
