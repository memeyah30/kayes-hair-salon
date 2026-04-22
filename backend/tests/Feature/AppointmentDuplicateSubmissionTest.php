<?php

namespace Tests\Feature;

use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentDuplicateSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_booking_request_id_returns_the_original_appointment_without_creating_another_one(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');
        $requestId = 'duplicate-booking-request-id';

        $firstResponse = $this
            ->withHeader('X-Booking-Request-Id', $requestId)
            ->postJson('/api/appointments', $this->bookingPayload($service, $date, 'same-request@example.com'));

        $firstResponse->assertOk();

        $secondResponse = $this
            ->withHeader('X-Booking-Request-Id', $requestId)
            ->postJson('/api/appointments', $this->bookingPayload($service, $date, 'same-request@example.com'));

        $secondResponse->assertOk()
            ->assertJsonPath('id', $firstResponse->json('id'));

        $this->assertDatabaseCount('appointments', 1);
    }

    public function test_duplicate_booking_payload_without_request_id_is_also_deduplicated(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');
        $payload = $this->bookingPayload($service, $date, 'same-payload@example.com');

        $firstResponse = $this->postJson('/api/appointments', $payload);
        $firstResponse->assertOk();

        $secondResponse = $this->postJson('/api/appointments', $payload);

        $secondResponse->assertOk()
            ->assertJsonPath('id', $firstResponse->json('id'));

        $this->assertDatabaseCount('appointments', 1);
    }

    private function createService(): Service
    {
        return Service::create([
            'name' => 'Hair Spa',
            'duration_minutes' => 30,
            'price_cents' => 35000,
        ]);
    }

    private function bookingPayload(Service $service, string $date, string $email): array
    {
        return [
            'customer_name' => 'Duplicate Click Customer',
            'customer_email' => $email,
            'customer_phone' => '09123456789',
            'customer_address' => 'Sample Address',
            'privacy_consent' => true,
            'service_id' => $service->id,
            'service_ids' => [$service->id],
            'date' => $date,
            'preferred_time' => '10:00',
            'payment_method' => 'on_hand',
            'downpayment_amount_cents' => 17500,
        ];
    }
}
