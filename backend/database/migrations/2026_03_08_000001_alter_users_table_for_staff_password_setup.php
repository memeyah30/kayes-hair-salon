<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'image')) {
                $table->string('image')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('stylist')->after('image');
            }
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('role');
            }
        });

        if (Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'password')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password')->nullable(false)->change();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $columns = [];

            foreach (['phone', 'image', 'role', 'status'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $columns[] = $column;
                }
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
