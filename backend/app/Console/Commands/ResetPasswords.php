<?php

namespace App\Console\Commands;

use App\Models\Admin;
use App\Models\Stylist;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ResetPasswords extends Command
{
    protected $signature = 'passwords:reset';
    protected $description = 'Reset admin and stylist passwords';

    public function handle()
    {
        // Reset admin password (bypass mutator by using DB directly)
        DB::table('admins')
            ->where('email', 'admin@tholits.local')
            ->update(['password' => Hash::make('admin123')]);
        
        $this->info('Admin password reset to: admin123');

        // Reset stylist password
        DB::table('stylists')
            ->where('email', 'stylist1@tholits.local')
            ->update(['password' => Hash::make('stylist123')]);
        
        $this->info('Stylist password reset to: stylist123');

        return 0;
    }
}
