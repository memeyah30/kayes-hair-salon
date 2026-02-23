<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staff')) {
            Schema::create('staff', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('stylists')->nullOnDelete();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->string('role')->default('stylist');
                $table->json('specialization')->nullable();
                $table->string('photo_path')->nullable();
                $table->string('status')->default('pending');
                $table->foreignId('created_by_manager_id')->nullable()->constrained('managers')->nullOnDelete();
                $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('rejected_reason')->nullable();
                $table->timestamps();

                $table->index('status');
                $table->index('role');
                $table->index('created_by_manager_id');
            });

            $this->backfillLegacyStylists();
            return;
        }

        if (!Schema::hasColumn('staff', 'user_id')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('stylists')->nullOnDelete();
            });
        }
        if (!Schema::hasColumn('staff', 'first_name')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('first_name')->nullable()->after('user_id');
            });
        }
        if (!Schema::hasColumn('staff', 'last_name')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('last_name')->nullable()->after('first_name');
            });
        }
        if (!Schema::hasColumn('staff', 'email')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('email')->nullable()->after('last_name');
            });
        }
        if (!Schema::hasColumn('staff', 'phone')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('phone')->nullable()->after('email');
            });
        }
        if (!Schema::hasColumn('staff', 'role')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('role')->default('stylist')->after('phone');
            });
        }
        if (!Schema::hasColumn('staff', 'specialization')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->json('specialization')->nullable()->after('role');
            });
        }
        if (!Schema::hasColumn('staff', 'photo_path')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('photo_path')->nullable()->after('specialization');
            });
        }
        if (!Schema::hasColumn('staff', 'status')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->string('status')->default('pending')->after('photo_path');
            });
        }
        if (!Schema::hasColumn('staff', 'created_by_manager_id')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->foreignId('created_by_manager_id')->nullable()->after('status')->constrained('managers')->nullOnDelete();
            });
        }
        if (!Schema::hasColumn('staff', 'approved_by_admin_id')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->foreignId('approved_by_admin_id')->nullable()->after('created_by_manager_id')->constrained('admins')->nullOnDelete();
            });
        }
        if (!Schema::hasColumn('staff', 'approved_at')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->timestamp('approved_at')->nullable()->after('approved_by_admin_id');
            });
        }
        if (!Schema::hasColumn('staff', 'rejected_reason')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->text('rejected_reason')->nullable()->after('approved_at');
            });
        }
        if (!Schema::hasColumn('staff', 'created_at') || !Schema::hasColumn('staff', 'updated_at')) {
            Schema::table('staff', function (Blueprint $table) {
                $table->timestamps();
            });
        }

        // Add indexes if missing (safe on repeated deploys).
        try {
            Schema::table('staff', function (Blueprint $table) {
                $table->index('status');
            });
        } catch (\Throwable $e) {
        }
        try {
            Schema::table('staff', function (Blueprint $table) {
                $table->index('role');
            });
        } catch (\Throwable $e) {
        }
        try {
            Schema::table('staff', function (Blueprint $table) {
                $table->index('created_by_manager_id');
            });
        } catch (\Throwable $e) {
        }

        $this->backfillLegacyStylists();
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }

    private function backfillLegacyStylists(): void
    {
        if (!Schema::hasTable('staff') || !Schema::hasTable('stylists')) {
            return;
        }

        $mappedIds = DB::table('staff')
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $stylists = DB::table('stylists')
            ->where('role', 'stylist')
            ->when(!empty($mappedIds), function ($query) use ($mappedIds) {
                $query->whereNotIn('id', $mappedIds);
            })
            ->get();

        $now = now();

        foreach ($stylists as $stylist) {
            $name = trim((string) ($stylist->name ?? ''));
            if ($name === '') {
                $firstName = 'Staff';
                $lastName = 'Member';
            } else {
                $parts = preg_split('/\s+/', $name);
                $firstName = array_shift($parts) ?: 'Staff';
                $lastName = !empty($parts) ? implode(' ', $parts) : 'Member';
            }

            $status = ((int) ($stylist->active ?? 1) === 1) ? 'approved' : 'rejected';

            DB::table('staff')->insert([
                'user_id' => $stylist->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $stylist->email,
                'phone' => $stylist->phone,
                'role' => 'stylist',
                'specialization' => null,
                'photo_path' => $stylist->image,
                'status' => $status,
                'created_by_manager_id' => null,
                'approved_by_admin_id' => null,
                'approved_at' => $status === 'approved' ? $now : null,
                'rejected_reason' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};
