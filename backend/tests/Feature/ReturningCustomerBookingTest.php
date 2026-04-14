<?php

namespace Tests\Feature;

use App\Mail\ReturningBookingOtpMail;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\CustomerOtp;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReturningCustomerBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_check_returns_no_existing_record_for_first_time_customer(): void
    {
        $this->postJson('/api/returning-booking/check-email', [
            'email' => 'new.customer@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('exists', false)
            ->assertJsonPath('message', 'No existing record found. Please fill out your information.');
    }

    public function test_existing_appointment_email_sends_a_returning_booking_verification_code(): void
    {
        Mail::fake();
        $this->configureMailForOtp();

        $service = $this->createService();
        $start = Carbon::tomorrow('Asia/Manila')->setTime(13, 0);
        $end = $start->copy()->addMinutes(30);

        Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Legacy Customer',
            'customer_email' => 'legacy.customer@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Legacy Address',
            'start_datetime' => $start->copy()->setTimezone('UTC'),
            'end_datetime' => $end->copy()->setTimezone('UTC'),
            'status' => 'booked',
        ]);

        $this->postJson('/api/returning-booking/check-email', [
            'email' => 'legacy.customer@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('message', 'Existing record found. Verification code sent to your email.');

        Mail::assertSent(ReturningBookingOtpMail::class, function (ReturningBookingOtpMail $mail): bool {
            return $mail->hasTo('legacy.customer@example.com');
        });

        $this->assertDatabaseHas('customer_otps', [
            'email' => 'legacy.customer@example.com',
            'purpose' => 'returning_booking',
        ]);
    }

    public function test_existing_customer_profile_email_sends_a_returning_booking_verification_code(): void
    {
        Mail::fake();
        $this->configureMailForOtp();

        Customer::create([
            'name' => 'Saved Customer',
            'email' => 'saved.customer@example.com',
            'phone' => '09123456789',
            'address' => 'Saved Address',
        ]);

        $this->postJson('/api/returning-booking/check-email', [
            'email' => 'saved.customer@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('message', 'Existing record found. Verification code sent to your email.');

        Mail::assertSent(ReturningBookingOtpMail::class, function (ReturningBookingOtpMail $mail): bool {
            return $mail->hasTo('saved.customer@example.com');
        });
    }

    public function test_verified_returning_customer_can_load_and_complete_missing_profile_fields(): void
    {
        Customer::create([
            'name' => 'Incomplete Customer',
            'email' => 'incomplete.customer@example.com',
            'phone' => null,
            'address' => 'Needs phone number',
        ]);

        $this->createReturningBookingOtp('incomplete.customer@example.com', '123456');

        $verifyResponse = $this->postJson('/api/returning-booking/verify-otp', [
            'email' => 'incomplete.customer@example.com',
            'otp' => '123456',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Verification successful. You may now continue booking.');

        $token = $verifyResponse->json('token');

        $profileResponse = $this
            ->withHeaders($this->returningBookingHeaders($token, 'incomplete.customer@example.com'))
            ->getJson('/api/returning-booking/profile')
            ->assertOk()
            ->assertJsonPath('customer.email', 'incomplete.customer@example.com')
            ->assertJsonPath('is_complete', false);

        $this->assertContains('phone', $profileResponse->json('missing_fields'));

        $this
            ->withHeaders($this->returningBookingHeaders($token, 'incomplete.customer@example.com'))
            ->patchJson('/api/returning-booking/profile', [
                'name' => 'Incomplete Customer',
                'phone' => '09123456789',
                'address' => 'Updated Address',
            ])
            ->assertOk()
            ->assertJsonPath('is_complete', true)
            ->assertJsonPath('customer.phone', '09123456789')
            ->assertJsonPath('customer.address', 'Updated Address');

        $this->assertDatabaseHas('customers', [
            'email' => 'incomplete.customer@example.com',
            'phone' => '09123456789',
            'address' => 'Updated Address',
        ]);
    }

    public function test_booking_persists_a_reusable_customer_profile_for_future_verified_bookings(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        $this->postJson('/api/appointments', [
            'customer_name' => 'Future Returning Customer',
            'customer_email' => 'future.returning@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Future Address',
            'privacy_consent' => true,
            'service_id' => $service->id,
            'service_ids' => [$service->id],
            'date' => $date,
            'preferred_time' => '14:00',
            'payment_method' => 'on_hand',
            'downpayment_amount_cents' => 5000,
        ])
            ->assertOk()
            ->assertJsonPath('customer_email', 'future.returning@example.com');

        $this->assertDatabaseHas('customers', [
            'email' => 'future.returning@example.com',
            'name' => 'Future Returning Customer',
            'phone' => '09123456789',
            'address' => 'Future Address',
        ]);

        $this->assertSame(1, Customer::query()->count());
    }

    private function configureMailForOtp(): void
    {
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.host', 'smtp.test');
        config()->set('mail.mailers.smtp.port', 1025);
        config()->set('mail.mailers.smtp.username', 'smtp-user');
        config()->set('mail.mailers.smtp.password', 'smtp-pass');
        config()->set('mail.from.address', 'noreply@example.com');
    }

    private function createService(): Service
    {
        return Service::create([
            'name' => 'Haircut',
            'duration_minutes' => 30,
            'price_cents' => 10000,
        ]);
    }

    private function createReturningBookingOtp(string $email, string $otp): CustomerOtp
    {
        return CustomerOtp::create([
            'email' => $email,
            'purpose' => 'returning_booking',
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'used_at' => null,
        ]);
    }

    private function returningBookingHeaders(string $token, string $email): array
    {
        return [
            'Authorization' => 'Bearer ' . $token,
            'X-Customer-Email' => $email,
        ];
    }
}
