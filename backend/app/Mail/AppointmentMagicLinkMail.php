<?php

namespace App\Mail;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentMagicLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public string $manageUrl
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your appointment is completed - Manage your booking',
        );
    }

    public function content(): Content
    {
        $this->appointment->loadMissing(['service:id,name', 'services:id,name']);

        $serviceName = $this->appointment->services->isNotEmpty()
            ? $this->appointment->services->pluck('name')->implode(', ')
            : ($this->appointment->service?->name ?? 'Salon Service');

        $dateTimeLabel = null;
        $rawStart = $this->appointment->getRawOriginal('start_datetime');
        if ($rawStart) {
            $dateTimeLabel = Carbon::parse($rawStart, 'UTC')
                ->setTimezone('Asia/Manila')
                ->format('F j, Y g:i A');
        }

        return new Content(
            view: 'emails.appointment_magic_link',
            with: [
                'customerName' => $this->appointment->customer_name ?: null,
                'serviceName' => $serviceName,
                'appointmentDateTime' => $dateTimeLabel,
                'manageUrl' => $this->manageUrl,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
