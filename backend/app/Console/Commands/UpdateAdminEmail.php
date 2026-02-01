<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class UpdateAdminEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:update-email';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update admin email from admin@tholits.local to admin';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $oldAdmin = DB::table('admins')->where('email', 'admin@tholits.local')->first();
        
        if ($oldAdmin) {
            // Check if 'admin' already exists
            $newAdmin = DB::table('admins')->where('email', 'admin')->first();
            
            if ($newAdmin) {
                $this->error('Admin with email "admin" already exists. Cannot update.');
                return 1;
            }
            
            // Update the email
            DB::table('admins')
                ->where('email', 'admin@tholits.local')
                ->update(['email' => 'admin']);
            
            $this->info('Successfully updated admin email from admin@tholits.local to admin');
            $this->info('You can now login with: admin / admin123');
        } else {
            $admin = DB::table('admins')->where('email', 'admin')->first();
            if ($admin) {
                $this->info('Admin email is already set to "admin"');
            } else {
                $this->error('No admin user found. Please run: php artisan db:seed --class=DatabaseSeeder');
                return 1;
            }
        }

        return 0;
    }
}
