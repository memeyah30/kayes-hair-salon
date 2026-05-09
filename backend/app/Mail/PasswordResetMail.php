<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $token;
    public $email;
    public $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct($token, $email)
    {
        $this->token = $token;
        $this->email = $email;
        
        // Build the frontend URL for password reset
        // Using an environment variable or falling back to a default
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $this->resetUrl = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token . '&email=' . urlencode($email);
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Reset Your Password - Kaye\'s Hair Salon')
                    ->view('emails.password-reset');
    }
}
