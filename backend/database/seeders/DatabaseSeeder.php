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
        
        Admin::firstOrCreate(
            ['email' => 'admin'],
            [
                'name' => 'Admin User',
                'password' => 'admin123', 
            ]
        );

    


User::create([
    'name' => 'Admin',
    'email' => 'admin@gmail.com',
    'password' => Hash::make('admin123'),
    'role' => 'admin',
    'status' => 'active',
]);
       

        
    }
}
