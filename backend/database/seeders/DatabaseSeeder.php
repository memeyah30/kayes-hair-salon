<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Service;
use App\Models\User;
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
        Admin::firstOrCreate(
            ['email' => 'admin'],
            [
                'name' => 'Admin User',
                'password' => 'admin123', // Mutator will hash this
            ]
        );

        User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        // Remove default stylist - stylists will be registered through admin panel
        // $stylist = Stylist::firstOrCreate(...) - REMOVED

        Service::firstOrCreate(
            ['name' => 'Haircut'],
            ['price_cents' => 80000]
        );

        Service::firstOrCreate(
            ['name' => 'Coloring'],
            ['price_cents' => 150000]
        );
    }
}
