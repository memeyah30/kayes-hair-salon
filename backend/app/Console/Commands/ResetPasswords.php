<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ResetPasswords extends Command
{
    protected $signature = 'passwords:reset';
    protected $description = 'Reset admin passwords';

    public function handle()
    {
        // Update admin email from old format to new format if needed
        $oldAdmin = DB::table('admins')->where('email', 'admin@tholits.local')->first();
        if ($oldAdmin) {
            DB::table('admins')
                ->where('email', 'admin@tholits.local')
                ->update(['email' => 'admin']);
            $this->info('Updated admin email from admin@tholits.local to admin');
        }

        // Reset admin password (bypass mutator by using DB directly)
        $admin = DB::table('admins')->where('email', 'admin')->first();
        if ($admin) {
            DB::table('admins')
                ->where('email', 'admin')
                ->update(['password' => Hash::make('admin123')]);
            $this->info('Admin password reset to: admin123');
            $this->info('Admin login: admin / admin123');
        } else {
            $this->error('Admin user not found. Please run: php artisan db:seed --class=DatabaseSeeder');
        }

        return 0;
    }
}
