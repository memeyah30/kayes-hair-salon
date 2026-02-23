<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('holidays')) {
            return;
        }

        Schema::table('holidays', function (Blueprint $table) {
            if (!Schema::hasColumn('holidays', 'type')) {
                $table->enum('type', ['holiday', 'occasion', 'closed'])->default('holiday')->after('date');
            }

            if (!Schema::hasColumn('holidays', 'recurring_yearly')) {
                $table->boolean('recurring_yearly')->default(false)->after('description');
            }
        });
    }

    public function down(): void
    {
        // No-op: this migration conditionally backfills legacy schemas.
    }
};
