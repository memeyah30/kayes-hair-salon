<?php

namespace App\Console\Commands;

use App\Services\MissedAppointmentService;
use Illuminate\Console\Command;

class MarkMissedAppointments extends Command
{
    protected $signature = 'appointments:mark-missed';

    protected $description = 'Automatically mark overdue active appointments as missed';

    public function handle(MissedAppointmentService $missedAppointments): int
    {
        $updatedCount = $missedAppointments->markOverdueAppointmentsAsMissed();

        $this->info("Marked {$updatedCount} appointment(s) as missed.");

        return self::SUCCESS;
    }
}
