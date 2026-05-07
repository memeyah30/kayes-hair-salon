<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private function dropForeignKeysReferencingColumns(string $tableName, array $columns): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }

        try {
            $foreignKeys = Schema::getForeignKeys($tableName);
        } catch (\Throwable $e) {
            return;
        }

        foreach ($foreignKeys as $foreignKey) {
            $foreignKeyColumns = $foreignKey['columns'] ?? [];

            if (!array_intersect($columns, $foreignKeyColumns)) {
                continue;
            }

            try {
                Schema::table($tableName, function (Blueprint $table) use ($foreignKey) {
                    $table->dropForeign($foreignKey['name']);
                });
            } catch (\Throwable $e) {
                // Ignore if the foreign key was already removed or renamed locally.
            }
        }
    }

    private function dropIndexesReferencingColumns(string $tableName, array $columns): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }

        try {
            $indexes = Schema::getIndexes($tableName);
        } catch (\Throwable $e) {
            return;
        }

        foreach ($indexes as $index) {
            $indexColumns = $index['columns'] ?? [];

            if (!array_intersect($columns, $indexColumns)) {
                continue;
            }

            try {
                Schema::table($tableName, function (Blueprint $table) use ($index) {
                    $table->dropIndex($index['name']);
                });
            } catch (\Throwable $e) {
                // Ignore if the index was already removed or renamed locally.
            }
        }
    }

    public function up(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if (Schema::hasTable('appointment_ratings') && Schema::hasColumn('appointment_ratings', 'stylist_rating')) {
            if (!Schema::hasColumn('appointment_ratings', 'team_rating')) {
                Schema::table('appointment_ratings', function (Blueprint $table) {
                    $table->unsignedTinyInteger('team_rating')->nullable()->after('service_rating');
                });
            }

            DB::statement('UPDATE appointment_ratings SET team_rating = stylist_rating');

            if (!$isSqlite) {
                Schema::table('appointment_ratings', function (Blueprint $table) {
                    try {
                        $table->dropColumn('stylist_rating');
                    } catch (\Throwable $e) {
                        // Ignore if the column was already removed.
                    }
                });
            }
        }

        if ($isSqlite) {
            return;
        }

        if (!$isSqlite && Schema::hasTable('appointments') && Schema::hasColumn('appointments', 'stylist_id')) {
            $this->dropForeignKeysReferencingColumns('appointments', ['stylist_id']);
            $this->dropIndexesReferencingColumns('appointments', ['stylist_id']);

            Schema::table('appointments', function (Blueprint $table) {
                $table->dropColumn('stylist_id');
            });
        }

        if (!$isSqlite && Schema::hasTable('customer_ratings') && Schema::hasColumn('customer_ratings', 'stylist_id')) {
            $this->dropForeignKeysReferencingColumns('customer_ratings', ['stylist_id']);
            $this->dropIndexesReferencingColumns('customer_ratings', ['stylist_id']);

            Schema::table('customer_ratings', function (Blueprint $table) {
                $table->dropColumn('stylist_id');
            });
        }

        if (!$isSqlite && Schema::hasTable('sales') && Schema::hasColumn('sales', 'stylist_id')) {
            $this->dropForeignKeysReferencingColumns('sales', ['stylist_id']);
            $this->dropIndexesReferencingColumns('sales', ['stylist_id']);

            Schema::table('sales', function (Blueprint $table) {
                $table->dropColumn('stylist_id');
            });
        }

        if (!$isSqlite && Schema::hasTable('staff') && Schema::hasColumn('staff', 'user_id')) {
            $this->dropForeignKeysReferencingColumns('staff', ['user_id']);
            $this->dropIndexesReferencingColumns('staff', ['user_id']);

            Schema::table('staff', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }

        Schema::dropIfExists('stylist_services');
        Schema::dropIfExists('service_stylist');
        Schema::dropIfExists('stylist_time_offs');
        Schema::dropIfExists('stylist_working_hours');
        Schema::dropIfExists('stylists');
    }

    public function down(): void
    {
        Schema::create('stylists', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->unique();
            $table->string('phone')->nullable();
            $table->json('specializations')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }
};
