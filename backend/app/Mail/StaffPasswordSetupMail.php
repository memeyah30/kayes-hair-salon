<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffPasswordSetupMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $staffName,
        public string $setupUrl,
        public int $expiresInHours = 24
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Set Up Your Salon Staff Password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff-password-setup',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
