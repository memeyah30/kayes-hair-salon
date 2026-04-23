<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Keep overdue active appointments aligned with the admin panel status rules.
Schedule::command('appointments:mark-missed')->everyMinute();
Schedule::command('appointments:send-reminders')
    ->dailyAt('08:00')
    ->timezone('Asia/Manila');
