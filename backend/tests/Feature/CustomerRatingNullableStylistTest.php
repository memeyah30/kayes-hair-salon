<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Appointment;
use App\Models\AppointmentRating;
use App\Models\CustomerRating;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerRatingNullableStylistTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_rating_submission_allows_completed_appointment_without_stylist(): void
    {
        $appointment = $this->createCompletedAppointmentWithoutStylist('public-rating@example.com');

        $this->postJson('/api/ratings', [
            'appointment_id' => $appointment->id,
            'rating' => 5,
            'comment' => 'Great service',
        ])
            ->assertCreated()
            ->assertJsonPath('appointment_id', $appointment->id)
            ->assertJsonPath('stylist_id', null);

        $this->assertDatabaseHas('customer_ratings', [
            'appointment_id' => $appointment->id,
            'stylist_id' => null,
            'rating' => 5,
        ]);
    }

    public function test_admin_ratings_sync_handles_appointment_ratings_for_unassigned_appointments(): void
    {
        $appointment = $this->createCompletedAppointmentWithoutStylist('synced-rating@example.com');

        AppointmentRating::create([
            'appointment_id' => $appointment->id,
            'customer_email' => 'synced-rating@example.com',
            'service_rating' => 5,
            'stylist_rating' => 4,
            'comment' => 'Nice visit',
        ]);

        $admin = Admin::create([
            'name' => 'Ratings Admin',
            'email' => 'ratings-admin@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($admin, 'admin')
            ->getJson('/api/ratings?type=admin', ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('0.appointment_id', $appointment->id)
            ->assertJsonPath('0.stylist_id', null);

        $this->assertDatabaseHas('customer_ratings', [
            'appointment_id' => $appointment->id,
            'stylist_id' => null,
            'rating' => 5,
        ]);
    }

    private function createCompletedAppointmentWithoutStylist(string $email): Appointment
    {
        $service = Service::create([
            'name' => 'Rating Service',
            'duration_minutes' => 30,
            'price_cents' => 15000,
        ]);

        $start = Carbon::now('Asia/Manila')->subDay()->setTime(14, 0);
        $end = $start->copy()->addMinutes(30);

        $appointment = Appointment::create([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Rating Customer',
            'customer_email' => $email,
            'customer_phone' => '09123456789',
            'customer_address' => 'Test Address',
            'payment_method' => 'online',
            'payment_status' => 'paid',
            'downpayment_amount_cents' => 15000,
            'total_amount_cents' => 15000,
            'start_datetime' => $start->copy()->setTimezone('UTC'),
            'end_datetime' => $end->copy()->setTimezone('UTC'),
            'status' => 'completed',
        ]);

        $appointment->services()->attach($service->id, ['service_variant_id' => null]);

        return $appointment;
    }
}
