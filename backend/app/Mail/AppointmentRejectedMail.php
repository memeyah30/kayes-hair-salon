<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AppointmentRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Appointment $appointment;
    public string $reason;

    public function __construct(Appointment $appointment, string $reason)
    {
        $this->appointment = $appointment;
        $this->reason = $reason;
    }

    public function build()
    {
        return $this->subject('Appointment Update: ' . config('app.name'))
            ->view('emails.appointment_rejected');
    }
}
