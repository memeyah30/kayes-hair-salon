<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Customer;
use App\Models\CustomerOtp;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerOtpSessionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_manage_booking_verification_stores_customer_session(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Managed Customer',
            'customer_email' => 'managed.customer@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Managed Address',
            'start_datetime' => Carbon::createFromFormat('Y-m-d H:i', "{$date} 14:00", 'Asia/Manila')->setTimezone('UTC'),
            'end_datetime' => Carbon::createFromFormat('Y-m-d H:i', "{$date} 14:30", 'Asia/Manila')->setTimezone('UTC'),
            'status' => 'booked',
        ]);

        $this->createOtp('managed.customer@example.com', 'manage_booking', '123456');

        $this->postJson('/api/manage-booking/verify-otp', [
            'email' => 'managed.customer@example.com',
            'otp' => '123456',
        ])
            ->assertOk()
            ->assertJsonPath('email', 'managed.customer@example.com')
            ->assertSessionHas('otp_verified', true)
            ->assertSessionHas('customer_email', 'managed.customer@example.com');
    }

    public function test_manage_booking_routes_accept_verified_customer_session_without_headers(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Managed Customer',
            'customer_email' => 'managed.session@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Managed Address',
            'start_datetime' => Carbon::createFromFormat('Y-m-d H:i', "{$date} 15:00", 'Asia/Manila')->setTimezone('UTC'),
            'end_datetime' => Carbon::createFromFormat('Y-m-d H:i', "{$date} 15:30", 'Asia/Manila')->setTimezone('UTC'),
            'status' => 'booked',
        ]);

        $this->withSession([
            'otp_verified' => true,
            'customer_email' => 'managed.session@example.com',
        ])->getJson('/api/manage-booking/appointments')
            ->assertOk()
            ->assertJsonCount(1, 'appointments')
            ->assertJsonPath('appointments.0.stylist_name', 'Salon Team');
    }

    public function test_returning_booking_verification_stores_customer_session(): void
    {
        Customer::create([
            'name' => 'Returning Customer',
            'email' => 'returning.session@example.com',
            'phone' => '09123456789',
            'address' => 'Returning Address',
        ]);

        $this->createOtp('returning.session@example.com', 'returning_booking', '654321');

        $this->postJson('/api/returning-booking/verify-otp', [
            'email' => 'returning.session@example.com',
            'otp' => '654321',
        ])
            ->assertOk()
            ->assertJsonPath('email', 'returning.session@example.com')
            ->assertSessionHas('otp_verified', true)
            ->assertSessionHas('customer_email', 'returning.session@example.com');
    }

    public function test_returning_booking_profile_accepts_verified_customer_session_without_headers(): void
    {
        Customer::create([
            'name' => 'Returning Customer',
            'email' => 'returning.profile@example.com',
            'phone' => '09123456789',
            'address' => 'Returning Address',
        ]);

        $this->withSession([
            'otp_verified' => true,
            'customer_email' => 'returning.profile@example.com',
        ])->getJson('/api/returning-booking/profile')
            ->assertOk()
            ->assertJsonPath('customer.email', 'returning.profile@example.com')
            ->assertJsonPath('is_complete', true);
    }

    private function createService(): Service
    {
        return Service::create([
            'name' => 'Haircut',
            'duration_minutes' => 30,
            'price_cents' => 10000,
        ]);
    }

    private function createOtp(string $email, string $purpose, string $otp): CustomerOtp
    {
        return CustomerOtp::create([
            'email' => $email,
            'purpose' => $purpose,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'used_at' => null,
        ]);
    }
}
