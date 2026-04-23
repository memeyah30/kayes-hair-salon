<?php

namespace App\Console\Commands;

use App\Services\AppointmentNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders {--date= : Optional Manila target date in Y-m-d format for testing}';

    protected $description = 'Send reminder emails for approved appointments scheduled for tomorrow';

    public function handle(AppointmentNotificationService $notifications): int
    {
        $targetDate = $this->resolveTargetDate();
        $query = $notifications->tomorrowApprovedAppointmentsQuery($targetDate);
        $appointments = $query->get();

        if ($appointments->isEmpty()) {
            $this->info('No approved appointments found for reminder sending.');
            return self::SUCCESS;
        }

        $sent = 0;
        $failed = 0;

        foreach ($appointments as $appointment) {
            try {
                $notifications->sendReminderEmail($appointment);
                $sent++;
                $this->line('Reminder sent for appointment #' . $appointment->id);
            } catch (\Throwable $e) {
                $failed++;

                Log::error('Failed to send appointment reminder email', [
                    'appointment_id' => $appointment->id,
                    'customer_email' => $appointment->customer_email,
                    'error' => $e->getMessage(),
                ]);

                $this->error('Failed reminder for appointment #' . $appointment->id . ': ' . $e->getMessage());
            }
        }

        $this->info("Reminder run complete. Sent: {$sent}. Failed: {$failed}.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function resolveTargetDate(): ?Carbon
    {
        $input = trim((string) $this->option('date'));
        if ($input === '') {
            return null;
        }

        return Carbon::createFromFormat('Y-m-d', $input, 'Asia/Manila');
    }
}
