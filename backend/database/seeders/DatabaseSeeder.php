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
        // Use 'admin' as the email/login identifier
        $admin = Admin::firstOrCreate(
            ['email' => 'admin'],
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

        // Remove default stylist - stylists will be registered through admin panel
        // $stylist = Stylist::firstOrCreate(...) - REMOVED

        Service::firstOrCreate(
            ['name' => 'Haircut'],
            ['duration_minutes' => 45, 'price_cents' => 80000]
        );

        Service::firstOrCreate(
            ['name' => 'Coloring'],
            ['duration_minutes' => 90, 'price_cents' => 150000]
        );
    }
}
