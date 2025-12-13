<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Service;
use App\Models\Stylist;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user (password will be hashed by mutator)
        $admin = Admin::firstOrCreate(
            ['email' => 'admin@tholits.local'],
            [
                'name' => 'Admin User',
                'password' => 'admin123', // Mutator will hash this
            ]
        );
        // Update password if admin already exists but password might be wrong
        if ($admin->wasRecentlyCreated === false) {
            $admin->password = 'admin123';
            $admin->save();
        }

        $stylist = Stylist::firstOrCreate(
            ['email' => 'stylist1@tholits.local'],
            [
                'name' => 'Jamie Stylist',
                'phone' => '0999-000-0000',
                'password' => Hash::make('stylist123'),
                'specializations' => ['hair', 'color'],
            ]
        );
        // Update password if stylist already exists
        if ($stylist->wasRecentlyCreated === false) {
            $stylist->password = Hash::make('stylist123');
            $stylist->save();
        }

        $stylist->workingHours()->delete();
        foreach ([1, 2, 3, 4, 5] as $weekday) { // Mon-Fri 9-5
            $stylist->workingHours()->create([
                'weekday' => $weekday,
                'start_time' => '09:00',
                'end_time' => '17:00',
            ]);
        }

        Service::firstOrCreate(
            ['name' => 'Haircut'],
            ['duration_minutes' => 45, 'price_cents' => 80000, 'specialization_tag' => 'hair']
        );

        Service::firstOrCreate(
            ['name' => 'Coloring'],
            ['duration_minutes' => 90, 'price_cents' => 150000, 'specialization_tag' => 'color']
        );
    }
}
