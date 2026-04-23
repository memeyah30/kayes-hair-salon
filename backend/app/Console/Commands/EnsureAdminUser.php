<?php

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Command;

class EnsureAdminUser extends Command
{
    protected $signature = 'admin:ensure-from-env {--update-password : Force the admin password to be updated from ADMIN_PASSWORD}';

    protected $description = 'Create or update the admin account from environment variables';

    public function handle(): int
    {
        $login = trim((string) env('ADMIN_LOGIN', 'admin'));
        $name = trim((string) env('ADMIN_NAME', 'Admin User'));
        $password = (string) env('ADMIN_PASSWORD', '');

        if ($login === '') {
            $this->error('ADMIN_LOGIN cannot be empty.');
            return self::FAILURE;
        }

        $admin = Admin::query()
            ->where('email', $login)
            ->orWhere('email', 'admin@tholits.local')
            ->first();

        if (!$admin) {
            if ($password === '') {
                $this->error('ADMIN_PASSWORD is required to create the initial admin account.');
                return self::FAILURE;
            }

            $admin = new Admin();
            $admin->email = $login;
            $admin->name = $name !== '' ? $name : 'Admin User';
            $admin->password = $password;
            $admin->save();

            $this->info(sprintf('Created admin account: %s', $login));
            return self::SUCCESS;
        }

        $dirty = false;

        if ($admin->email !== $login) {
            $admin->email = $login;
            $dirty = true;
        }

        if ($name !== '' && $admin->name !== $name) {
            $admin->name = $name;
            $dirty = true;
        }

        if ($this->option('update-password')) {
            if ($password === '') {
                $this->error('ADMIN_PASSWORD is required when using --update-password.');
                return self::FAILURE;
            }

            $admin->password = $password;
            $dirty = true;
        }

        if ($dirty) {
            $admin->save();
        }

        $this->info(sprintf(
            'Admin account is ready: %s%s',
            $login,
            $this->option('update-password') ? ' (password refreshed)' : ''
        ));

        return self::SUCCESS;
    }
}
