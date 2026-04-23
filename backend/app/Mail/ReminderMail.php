<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Services\AppointmentNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reminder: your salon appointment is tomorrow',
        );
    }

    public function content(): Content
    {
        $data = app(AppointmentNotificationService::class)->mailViewData($this->appointment);

        return new Content(
            view: 'emails.appointment-reminder',
            with: $data,
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
