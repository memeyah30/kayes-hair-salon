<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
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
            $parts = $name === '' ? [] : preg_split('/\s+/', $name);
            $firstName = !empty($parts) ? (array_shift($parts) ?: 'Staff') : 'Staff';
            $lastName = !empty($parts) ? implode(' ', $parts) : 'Member';
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

    public function down(): void
    {
        // Intentionally no-op. Backfilled rows represent approved legacy staff.
    }
};

