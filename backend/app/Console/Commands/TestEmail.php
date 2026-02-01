<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email configuration by sending a test email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $testEmail = $this->argument('email');
        $mailDriver = config('mail.default');
        
        $this->info("═══════════════════════════════════════════════════");
        $this->info("           EMAIL CONFIGURATION TEST");
        $this->info("═══════════════════════════════════════════════════");
        $this->line("");

        $this->info("Current Mail Driver: {$mailDriver}");
        $this->info("Sending test email to: {$testEmail}");
        $this->line("");

        if ($mailDriver === 'log') {
            $this->error("⚠️  WARNING: Mail driver is set to 'log'");
            $this->warn("   Emails will only be logged to storage/logs/laravel.log");
            $this->warn("   They will NOT be sent to actual email addresses.");
            $this->line("");
            $this->info("To fix this:");
            $this->line("   1. Update your .env file:");
            $this->line("      MAIL_MAILER=smtp");
            $this->line("      MAIL_HOST=smtp.gmail.com");
            $this->line("      MAIL_PORT=587");
            $this->line("      MAIL_USERNAME=your-email@gmail.com");
            $this->line("      MAIL_PASSWORD=your-app-password");
            $this->line("      MAIL_ENCRYPTION=tls");
            $this->line("");
            $this->line("   2. Run: php artisan config:clear");
            $this->line("   3. Run this test again: php artisan email:test {$testEmail}");
            $this->line("");
            $this->info("See EMAIL_SETUP_GUIDE.md for detailed instructions.");
            return 1;
        }

        try {
            $message = "This is a test email from Kaye's Hair Salon and Spa.\n\n";
            $message .= "If you received this email, your email configuration is working correctly!\n\n";
            $message .= "Mail Driver: {$mailDriver}\n";
            $message .= "Sent at: " . now()->toDateTimeString() . "\n";

            Mail::raw($message, function ($mail) use ($testEmail) {
                $mail->to($testEmail)
                     ->subject('✓ Kaye\'s Hair Salon and Spa - Email Test');
            });

            $this->info("✓ Test email sent successfully!");
            $this->line("");
            $this->info("Please check the inbox (and spam folder) of: {$testEmail}");
            $this->line("");
            $this->info("If you don't receive the email:");
            $this->line("   - Check spam/junk folder");
            $this->line("   - Verify SMTP credentials in .env");
            $this->line("   - Check storage/logs/laravel.log for errors");

            return 0;
        } catch (\Exception $e) {
            $this->error("✗ Failed to send test email!");
            $this->error("Error: " . $e->getMessage());
            $this->line("");
            $this->info("Common issues:");
            $this->line("   - Wrong SMTP credentials (username/password)");
            $this->line("   - Wrong SMTP host/port");
            $this->line("   - Firewall blocking SMTP connection");
            $this->line("   - Gmail requires App Password (not regular password)");
            $this->line("");
            $this->info("Check storage/logs/laravel.log for detailed error information.");

            Log::error('Email test failed', [
                'email' => $testEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return 1;
        }
    }
}
