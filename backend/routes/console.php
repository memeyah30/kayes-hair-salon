<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('salon:purge-customer-data {--force : Skip the confirmation prompt}', function () {
    if (! $this->option('force')) {
        $confirmed = $this->confirm(
            'This will permanently delete appointments, customers, sales, and related customer records. Continue?'
        );

        if (! $confirmed) {
            $this->warn('Operation cancelled.');
            return 0;
        }
    }

    $deletions = [];

    $purgeTable = function (string $table, ?callable $constraint = null) use (&$deletions): void {
        if (! Schema::hasTable($table)) {
            $deletions[$table] = 0;
            return;
        }

        $query = DB::table($table);

        if ($constraint !== null) {
            $constraint($query);
        }

        $count = $query->count();

        if ($count > 0) {
            $query->delete();
        }

        $deletions[$table] = $count;
    };

    DB::transaction(function () use ($purgeTable) {
        // Delete appointment-linked records first so nothing is left behind.
        $purgeTable('notifications', function ($query): void {
            $query->whereNotNull('appointment_id');
        });
        $purgeTable('sales');
        $purgeTable('customer_otps');
        $purgeTable('appointment_ratings');
        $purgeTable('customer_ratings');
        $purgeTable('appointment_links');
        $purgeTable('appointments');
        $purgeTable('customers');
    });

    foreach ($deletions as $table => $count) {
        $this->info(sprintf('Deleted %d row(s) from %s.', $count, $table));
    }

    $this->info('Customer, appointment, and sales data have been cleared.');
    return 0;
})->purpose('Delete appointments, customers, sales, and related customer data');

// Keep overdue active appointments aligned with the admin panel status rules.
Schedule::command('appointments:mark-missed')->everyMinute();
Schedule::command('appointments:send-reminders')
    ->dailyAt('08:00')
    ->timezone('Asia/Manila');
