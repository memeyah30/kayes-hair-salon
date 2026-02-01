<?php

namespace App\Jobs;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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

        $emailStatus = 'not_sent';
        $smsStatus = 'not_sent';
        $emailError = null;
        $smsError = null;
        $channels = [];

        // Send Email if available - REQUIRED for confirmation
        if ($appointment->customer_email) {
            // Check mail configuration first
            $mailDriver = config('mail.default');
            
            if ($mailDriver === 'log') {
                $errorMsg = '⚠️ EMAIL NOT SENT: Mail driver is set to "log" - emails are only being logged to storage/logs/laravel.log, not actually sent to customers.';
                $errorMsg .= ' To fix: Update .env file with MAIL_MAILER=smtp and SMTP credentials. See EMAIL_SETUP_GUIDE.md for instructions.';
                Log::error($errorMsg, [
                    'appointment_id' => $appointment->id,
                    'customer_email' => $appointment->customer_email,
                    'mail_driver' => $mailDriver,
                    'fix_required' => 'Update .env MAIL_MAILER from "log" to "smtp"'
                ]);
                $emailStatus = 'would_send';
                $emailError = 'Mail driver is "log" - emails not actually sent. Check logs and configure SMTP.';
                $channels[] = 'email';
            } else {
                // Mail driver is configured - try to send
                try {

                    $appointmentDate = \Carbon\Carbon::parse($appointment->start_datetime);
                    $endDate = \Carbon\Carbon::parse($appointment->end_datetime);
                    
                    // Create a more detailed email message
                    $message = "═══════════════════════════════════════════════════\n";
                    $message .= "    KAYE'S HAIR SALON AND SPA - APPOINTMENT CONFIRMED\n";
                    $message .= "═══════════════════════════════════════════════════\n\n";
                    $message .= "Hello {$appointment->customer_name},\n\n";
                    $message .= "Thank you for booking with Kaye's Hair Salon and Spa!\n";
                    $message .= "Your appointment has been confirmed.\n\n";
                    $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                    $message .= "APPOINTMENT DETAILS:\n";
                    $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
                    $message .= "Service:     {$appointment->service->name}\n";
                    $message .= "Stylist:     {$appointment->stylist->name}\n";
                    $message .= "Date:        {$appointmentDate->format('F d, Y (l)')}\n";
                    $message .= "Time:        {$appointmentDate->format('h:i A')} - {$endDate->format('h:i A')}\n";
                    $message .= "Duration:    " . ($appointment->service->duration_minutes ?? 30) . " minutes\n";
                    $message .= "Price:       ₱" . number_format(($appointment->service->price_cents ?? 0) / 100, 2) . "\n";
                    $message .= "Status:      Confirmed ✓\n\n";
                    $message .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
                    $message .= "We look forward to seeing you!\n\n";
                    $message .= "If you need to reschedule or cancel, please contact us.\n\n";
                    $message .= "Best regards,\n";
                    $message .= "Kaye's Hair Salon and Spa Team\n";
                    $message .= "═══════════════════════════════════════════════════\n";

                    // Send email using raw method (most reliable)
                    Mail::raw($message, function ($mail) use ($appointment) {
                        $mail->to($appointment->customer_email)
                             ->subject('✓ Appointment Confirmed - Kaye\'s Hair Salon and Spa');
                    });

                    $emailStatus = 'sent';
                    $channels[] = 'email';
                    
                    Log::info("✓ Confirmation email sent successfully to: {$appointment->customer_email}", [
                        'appointment_id' => $appointment->id,
                        'customer_name' => $appointment->customer_name,
                        'mail_driver' => $mailDriver
                    ]);
                } catch (\Exception $e) {
                    $emailStatus = 'failed';
                    $emailError = $e->getMessage();
                    Log::error('✗ Failed to send confirmation email', [
                        'appointment_id' => $appointment->id,
                        'email' => $appointment->customer_email,
                        'error' => $e->getMessage(),
                        'mail_driver' => config('mail.default'),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }
        } else {
            Log::warning('No email provided for appointment confirmation', [
                'appointment_id' => $appointment->id,
                'customer_name' => $appointment->customer_name,
                'customer_phone' => $appointment->customer_phone
            ]);
        }

        // Send SMS if phone available
        if ($appointment->customer_phone) {
            try {
                // TODO: Integrate SMS service (Twilio, Nexmo, Semaphore, etc.)
                // For now, we'll log it and mark as would_send
                // When SMS service is integrated, replace this with actual SMS sending
                
                $appointmentDate = \Carbon\Carbon::parse($appointment->start_datetime);
                $smsMessage = "Hi {$appointment->customer_name}! Your appointment at Kaye's Hair Salon and Spa is confirmed. ";
                $smsMessage .= "Service: {$appointment->service->name} with {$appointment->stylist->name}. ";
                $smsMessage .= "Date: {$appointmentDate->format('M d, Y h:i A')}. ";
                $smsMessage .= "See you soon!";
                
                // Placeholder for SMS sending
                // Example with Twilio:
                // $client = new \Twilio\Rest\Client(env('TWILIO_SID'), env('TWILIO_TOKEN'));
                // $client->messages->create($appointment->customer_phone, [
                //     'from' => env('TWILIO_PHONE'),
                //     'body' => $smsMessage
                // ]);
                
                Log::info("SMS confirmation would be sent to: {$appointment->customer_phone}", [
                    'message' => $smsMessage
                ]);
                
                // For now, mark as would_send (change to 'sent' when SMS is integrated)
                $smsStatus = 'would_send';
                $channels[] = 'sms';
            } catch (\Exception $e) {
                $smsStatus = 'failed';
                $smsError = $e->getMessage();
                Log::error('Failed to send confirmation SMS: ' . $e->getMessage());
            }
        }

        // Determine overall status
        $overallStatus = 'failed';
        if ($emailStatus === 'sent' || $smsStatus === 'sent' || $smsStatus === 'would_send') {
            $overallStatus = 'sent';
        } elseif ($emailStatus === 'failed' && $smsStatus === 'failed') {
            $overallStatus = 'failed';
        }

        // Notification sent (logging handled above)
    }
}






