<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_booking_accepts_null_stylist_until_slot_capacity_is_reached(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        for ($index = 1; $index <= 5; $index++) {
            $response = $this->postJson('/api/appointments', $this->bookingPayload($service, $date, "customer{$index}@example.com"));

            $response->assertOk()
                ->assertJsonPath('stylist_id', null);
        }

        $this->assertDatabaseCount('appointments', 5);
        $this->assertDatabaseHas('appointments', [
            'customer_email' => 'customer1@example.com',
            'stylist_id' => null,
        ]);

        $this->postJson('/api/appointments', $this->bookingPayload($service, $date, 'customer6@example.com'))
            ->assertStatus(409)
            ->assertJsonPath('errors.time.0', 'This time slot is already fully booked. Please select another time.');
    }

    public function test_capacity_availability_endpoint_reports_remaining_slots_and_full_slots(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        $this->createAppointment($service, $date, '14:00');
        $this->createAppointment($service, $date, '14:00');
        $this->createAppointment($service, $date, '15:00');
        $this->createAppointment($service, $date, '15:00');
        $this->createAppointment($service, $date, '15:00');
        $this->createAppointment($service, $date, '15:00');
        $this->createAppointment($service, $date, '15:00');

        $response = $this->getJson("/api/appointments/availability?date={$date}&service_duration=30");
        $response->assertOk();

        $slots = collect($response->json());
        $twoPmSlot = $slots->first(fn (array $slot) => str_contains((string) $slot['start'], 'T14:00:00'));
        $threePmSlot = $slots->first(fn (array $slot) => str_contains((string) $slot['start'], 'T15:00:00'));

        $this->assertNotNull($twoPmSlot);
        $this->assertNotNull($threePmSlot);
        $this->assertSame(2, $twoPmSlot['booked_count']);
        $this->assertSame(3, $twoPmSlot['remaining_slots']);
        $this->assertTrue($twoPmSlot['available']);
        $this->assertSame(5, $threePmSlot['booked_count']);
        $this->assertSame(0, $threePmSlot['remaining_slots']);
        $this->assertFalse($threePmSlot['available']);
    }

    public function test_longer_appointments_only_occupy_their_selected_start_slot(): void
    {
        $service = $this->createService();
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        $this->createAppointment($service, $date, '16:00', 60);

        $response = $this->getJson("/api/appointments/availability?date={$date}&service_duration=30");
        $response->assertOk();

        $slots = collect($response->json());
        $fourPmSlot = $slots->first(fn (array $slot) => str_contains((string) $slot['start'], 'T16:00:00'));
        $fourThirtyPmSlot = $slots->first(fn (array $slot) => str_contains((string) $slot['start'], 'T16:30:00'));

        $this->assertNotNull($fourPmSlot);
        $this->assertNotNull($fourThirtyPmSlot);
        $this->assertSame(1, $fourPmSlot['booked_count']);
        $this->assertSame(4, $fourPmSlot['remaining_slots']);
        $this->assertSame(0, $fourThirtyPmSlot['booked_count']);
        $this->assertSame(5, $fourThirtyPmSlot['remaining_slots']);
    }

    private function createService(): Service
    {
        return Service::create([
            'name' => 'Haircut',
            'duration_minutes' => 30,
            'price_cents' => 10000,
        ]);
    }

    private function bookingPayload(Service $service, string $date, string $email): array
    {
        return [
            'customer_name' => 'Sample Customer',
            'customer_email' => $email,
            'customer_phone' => '09123456789',
            'customer_address' => 'Sample Address',
            'privacy_consent' => true,
            'service_id' => $service->id,
            'service_ids' => [$service->id],
            'date' => $date,
            'preferred_time' => '14:00',
            'payment_method' => 'on_hand',
            'downpayment_amount_cents' => 5000,
        ];
    }

    private function createAppointment(Service $service, string $date, string $time, int $durationMinutes = 30): Appointment
    {
        $start = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$time}", 'Asia/Manila');
        $end = $start->copy()->addMinutes($durationMinutes);

        return Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Existing Customer',
            'customer_email' => uniqid('customer', true) . '@example.com',
            'customer_phone' => '09123456789',
            'start_datetime' => $start->copy()->setTimezone('UTC'),
            'end_datetime' => $end->copy()->setTimezone('UTC'),
            'status' => 'booked',
        ]);
    }
}
