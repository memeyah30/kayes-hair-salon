<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Appointment;
use App\Models\CustomerRating;
use App\Models\Sale;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_appointments_endpoint_returns_paginated_results(): void
    {
        $admin = $this->createAdmin();
        $service = $this->createService();

        foreach (range(1, 12) as $index) {
            $this->createAppointment($service, [
                'customer_name' => "Appointment Customer {$index}",
                'customer_email' => "appointment{$index}@example.com",
                'status' => 'booked',
                'start_datetime' => Carbon::tomorrow('Asia/Manila')->copy()->setTime(8, 0)->addMinutes(($index - 1) * 30)->setTimezone('UTC'),
                'end_datetime' => Carbon::tomorrow('Asia/Manila')->copy()->setTime(8, 30)->addMinutes(($index - 1) * 30)->setTimezone('UTC'),
            ]);
        }

        $this->actingAs($admin, 'admin')
            ->getJson('/api/appointments?paginate=1&per_page=10&page=2&status=booked&type=admin', ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 12)
            ->assertJsonCount(2, 'data');
    }

    public function test_sales_endpoint_returns_paginated_results(): void
    {
        $admin = $this->createAdmin();

        foreach (range(1, 12) as $index) {
            Sale::create([
                'transaction_type' => 'service',
                'item_name' => "Sale {$index}",
                'quantity' => 1,
                'unit_price_cents' => 10000,
                'total_amount_cents' => 10000,
                'payment_method' => 'cash',
                'payment_status' => 'paid',
                'customer_name' => "Sale Customer {$index}",
                'customer_phone' => '09123456789',
                'created_at' => Carbon::tomorrow('Asia/Manila')->subDays(1)->addMinutes($index)->setTimezone('UTC'),
                'updated_at' => Carbon::tomorrow('Asia/Manila')->subDays(1)->addMinutes($index)->setTimezone('UTC'),
            ]);
        }

        $today = Carbon::now('Asia/Manila')->format('Y-m-d');

        $this->actingAs($admin, 'admin')
            ->getJson("/sales?paginate=1&per_page=10&page=2&transaction_type=service&start_date={$today}&end_date={$today}", ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 12)
            ->assertJsonCount(2, 'data');
    }

    public function test_sales_endpoint_includes_booked_and_confirmed_appointments_with_deposits(): void
    {
        $admin = $this->createAdmin();
        $service = $this->createService();
        $reportDate = Carbon::now('Asia/Manila')->format('Y-m-d');

        $bookedAppointment = $this->createAppointment($service, [
            'customer_name' => 'Booked Deposit Customer',
            'customer_email' => 'booked@example.com',
            'status' => 'booked',
            'payment_status' => 'pending',
            'downpayment_amount_cents' => 5000,
        ]);

        $confirmedAppointment = $this->createAppointment($service, [
            'customer_name' => 'Confirmed Deposit Customer',
            'customer_email' => 'confirmed@example.com',
            'status' => 'confirmed',
            'payment_status' => 'pending',
            'downpayment_amount_cents' => 5000,
        ]);

        Sale::create([
            'appointment_id' => $bookedAppointment->id,
            'transaction_type' => 'service',
            'item_name' => 'Booked Deposit Service',
            'quantity' => 1,
            'unit_price_cents' => 15000,
            'total_amount_cents' => 15000,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'customer_name' => $bookedAppointment->customer_name,
            'customer_phone' => $bookedAppointment->customer_phone,
            'created_at' => Carbon::createFromFormat('Y-m-d', $reportDate, 'Asia/Manila')->setTimezone('UTC'),
            'updated_at' => Carbon::createFromFormat('Y-m-d', $reportDate, 'Asia/Manila')->setTimezone('UTC'),
        ]);

        Sale::create([
            'appointment_id' => $confirmedAppointment->id,
            'transaction_type' => 'service',
            'item_name' => 'Confirmed Deposit Service',
            'quantity' => 1,
            'unit_price_cents' => 15000,
            'total_amount_cents' => 15000,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'customer_name' => $confirmedAppointment->customer_name,
            'customer_phone' => $confirmedAppointment->customer_phone,
            'created_at' => Carbon::createFromFormat('Y-m-d', $reportDate, 'Asia/Manila')->setTimezone('UTC'),
            'updated_at' => Carbon::createFromFormat('Y-m-d', $reportDate, 'Asia/Manila')->setTimezone('UTC'),
        ]);

        $this->actingAs($admin, 'admin')
            ->getJson("/sales?paginate=1&per_page=10&page=1&start_date={$reportDate}&end_date={$reportDate}&appointment_status=booked", ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.appointment.status', 'booked')
            ->assertJsonPath('data.0.appointment.amount_paid_cents', 5000)
            ->assertJsonPath('data.0.appointment.remaining_balance_cents', 10000);

        $this->actingAs($admin, 'admin')
            ->getJson("/sales?paginate=1&per_page=10&page=1&start_date={$reportDate}&end_date={$reportDate}&appointment_status=confirmed", ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.appointment.status', 'confirmed')
            ->assertJsonPath('data.0.appointment.amount_paid_cents', 5000)
            ->assertJsonPath('data.0.appointment.remaining_balance_cents', 10000);

        $this->actingAs($admin, 'admin')
            ->getJson("/sales?paginate=1&per_page=10&page=1&start_date={$reportDate}&end_date={$reportDate}", ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_sales_endpoint_filters_by_recorded_at_instead_of_booking_date(): void
    {
        $admin = $this->createAdmin();

        Sale::create([
            'transaction_type' => 'service',
            'item_name' => 'Recorded Sale',
            'quantity' => 1,
            'unit_price_cents' => 20000,
            'total_amount_cents' => 20000,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'customer_name' => 'Recorded Customer',
            'customer_phone' => '09123456789',
            'created_at' => Carbon::now('Asia/Manila')->subDays(3)->setTimezone('UTC'),
            'updated_at' => Carbon::now('Asia/Manila')->subDays(1)->setTimezone('UTC'),
            'recorded_at' => Carbon::now('Asia/Manila')->subDay()->setTimezone('UTC'),
        ]);

        $today = Carbon::now('Asia/Manila')->format('Y-m-d');
        $yesterday = Carbon::now('Asia/Manila')->subDay()->format('Y-m-d');

        $this->actingAs($admin, 'admin')
            ->getJson("/sales?paginate=1&per_page=10&page=1&start_date={$yesterday}&end_date={$today}", ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.item_name', 'Recorded Sale');
    }

    public function test_customer_endpoint_returns_paginated_customer_summaries(): void
    {
        $admin = $this->createAdmin();
        $service = $this->createService();

        foreach (range(1, 12) as $index) {
            $this->createAppointment($service, [
                'customer_name' => "Customer {$index}",
                'customer_email' => "customer{$index}@example.com",
            ]);
        }

        $this->actingAs($admin, 'admin')
            ->getJson('/api/customers?paginate=1&per_page=10&page=2&type=admin', ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 12)
            ->assertJsonCount(2, 'data');
    }

    public function test_ratings_endpoint_returns_paginated_results_with_summary(): void
    {
        $admin = $this->createAdmin();
        $service = $this->createService();

        foreach (range(1, 12) as $index) {
            $appointment = $this->createAppointment($service, [
                'customer_name' => "Rated Customer {$index}",
                'customer_email' => "rated{$index}@example.com",
                'status' => 'completed',
            ]);

            CustomerRating::create([
                'appointment_id' => $appointment->id,
                'stylist_id' => null,
                'customer_name' => $appointment->customer_name,
                'customer_email' => $appointment->customer_email,
                'rating' => 5,
                'comment' => 'Excellent',
            ]);
        }

        $this->actingAs($admin, 'admin')
            ->getJson('/api/ratings?paginate=1&per_page=10&page=2&rating=5&type=admin', ['X-User-Type' => 'admin'])
            ->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 12)
            ->assertJsonPath('summary.total_ratings', 12)
            ->assertJsonPath('summary.rating_distribution.5', 12)
            ->assertJsonCount(2, 'data');
    }

    private function createAdmin(): Admin
    {
        return Admin::create([
            'name' => 'Pagination Admin',
            'email' => 'pagination-admin@example.com',
            'password' => 'password123',
        ]);
    }

    private function createService(): Service
    {
        return Service::create([
            'name' => 'Pagination Service',
            'duration_minutes' => 30,
            'price_cents' => 15000,
        ]);
    }

    private function createAppointment(Service $service, array $overrides = []): Appointment
    {
        $start = Carbon::tomorrow('Asia/Manila')->setTime(9, 0);
        $end = $start->copy()->addMinutes(30);

        $appointment = Appointment::create(array_merge([
            'stylist_id' => null,
            'service_id' => $service->id,
            'customer_name' => 'Default Customer',
            'customer_email' => 'default@example.com',
            'customer_phone' => '09123456789',
            'customer_address' => 'Sample Address',
            'payment_method' => 'online',
            'payment_status' => 'pending',
            'downpayment_amount_cents' => 5000,
            'total_amount_cents' => 15000,
            'start_datetime' => $start->copy()->setTimezone('UTC'),
            'end_datetime' => $end->copy()->setTimezone('UTC'),
            'status' => 'booked',
        ], $overrides));

        $appointment->services()->attach($service->id, ['service_variant_id' => null]);

        return $appointment;
    }
}
