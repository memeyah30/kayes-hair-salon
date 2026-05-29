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
    
    public function run(): void
    {
        
        $adminUsername = env('ADMIN_LOGIN', 'admin');
        $adminPassword = env('ADMIN_PASSWORD', 'admin123');

        $admin = Admin::first();
        if ($admin) {
            $admin->update([
                'email' => $adminUsername,
                'password' => $adminPassword,
            ]);
        } else {
            Admin::create([
                'name' => 'Admin User',
                'email' => $adminUsername,
                'password' => $adminPassword,
            ]);
        }

    


User::create([
    'name' => 'Admin',
    'email' => 'admin@gmail.com',
    'password' => Hash::make('admin123'),
    'role' => 'admin',
    'status' => 'active',
]);
       

        
    }
}
