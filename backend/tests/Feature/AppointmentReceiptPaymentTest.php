<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentReceiptPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_receipt_endpoint_exposes_payment_details_and_remaining_balance(): void
    {
        $service = $this->createService(120000);
        $start = Carbon::tomorrow('Asia/Manila')->setTime(14, 0);
        $end = $start->copy()->addMinutes(30);

        $appointment = Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Receipt Customer',
            'customer_email' => 'receipt@example.com',
            'customer_phone' => '09123456789',
            'payment_method' => 'online',
            'payment_status' => 'downpayment',
            'downpayment_amount_cents' => 50000,
            'total_amount_cents' => 120000,
            'start_datetime' => $start->copy()->setTimezone('UTC'),
            'end_datetime' => $end->copy()->setTimezone('UTC'),
            'status' => 'booked',
        ]);

        $appointment->services()->attach($service->id, ['service_variant_id' => null]);

        $this->getJson("/api/appointments/{$appointment->id}/receipt")
            ->assertOk()
            ->assertJsonPath('appointment.mode_of_payment', 'downpayment')
            ->assertJsonPath('appointment.amount_paid_cents', 50000)
            ->assertJsonPath('appointment.remaining_balance_cents', 70000);
    }

    public function test_customer_booking_rejects_amount_paid_greater_than_total_amount(): void
    {
        $service = $this->createService(10000);
        $date = Carbon::tomorrow('Asia/Manila')->format('Y-m-d');

        $this->postJson('/api/appointments', [
            'customer_name' => 'Overpay Customer',
            'customer_email' => 'overpay@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Sample Address',
            'privacy_consent' => true,
            'service_id' => $service->id,
            'service_ids' => [$service->id],
            'date' => $date,
            'preferred_time' => '14:00',
            'payment_method' => 'online',
            'downpayment_amount_cents' => 15000,
            'payment_proof_url' => 'https://example.com/proof.jpg',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.downpayment_amount_cents.0', 'Amount paid cannot be greater than the total amount.');
    }

    private function createService(int $priceCents = 10000): Service
    {
        return Service::create([
            'name' => 'Haircut',
            'duration_minutes' => 30,
            'price_cents' => $priceCents,
        ]);
    }
}
