<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\NotificationLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $appointmentId, public int $hoursBefore = 1)
    {
    }

    public function handle(): void
    {
        $appointment = Appointment::with('service', 'stylist')->find($this->appointmentId);
        if (!$appointment) {
            return;
        }

        NotificationLog::create([
            'appointment_id' => $appointment->id,
            'channel' => 'email',
            'type' => 'reminder',
            'status' => 'sent',
            'payload' => json_encode([
                'to' => $appointment->customer_email,
                'message' => "Reminder: your appointment is in {$this->hoursBefore} hour(s) at {$appointment->start_datetime}",
            ]),
        ]);
    }
}






