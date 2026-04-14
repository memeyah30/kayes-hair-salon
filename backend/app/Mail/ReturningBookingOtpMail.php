<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReturningBookingOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp,
        public int $expiresInMinutes = 10
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your verification code to continue booking',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.returning-booking-otp',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
