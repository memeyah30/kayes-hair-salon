<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\NotificationLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $appointmentId)
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
            'type' => 'confirmation',
            'status' => 'sent',
            'payload' => json_encode([
                'to' => $appointment->customer_email,
                'message' => 'Your appointment is confirmed for ' . $appointment->start_datetime,
            ]),
        ]);
    }
}






