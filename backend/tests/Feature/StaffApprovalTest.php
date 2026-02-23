<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Manager;
use App\Models\Staff;
use App\Models\Stylist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_can_create_pending_staff(): void
    {
        $manager = Manager::create([
            'name' => 'Manager One',
            'username' => 'manager_one',
            'password' => 'secret123',
            'active' => true,
        ]);

        $response = $this->actingAs($manager, 'manager')->postJson('/manager/staff', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'phone' => '09170000000',
            'role' => 'stylist',
            'specialization' => ['color', 'rebond'],
            'status' => 'approved',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('staff', [
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
        ]);
    }

    public function test_manager_cannot_approve(): void
    {
        $manager = Manager::create([
            'name' => 'Manager One',
            'username' => 'manager_one',
            'password' => 'secret123',
            'active' => true,
        ]);

        $staff = Staff::create([
            'first_name' => 'Pending',
            'last_name' => 'Staff',
            'role' => 'stylist',
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
        ]);

        $response = $this->actingAs($manager, 'manager')->patchJson("/admin/staff/{$staff->id}/approve");

        $response->assertForbidden();
    }

    public function test_admin_can_approve_pending_staff(): void
    {
        $manager = Manager::create([
            'name' => 'Manager One',
            'username' => 'manager_one',
            'password' => 'secret123',
            'active' => true,
        ]);

        $admin = Admin::create([
            'name' => 'Admin One',
            'email' => 'admin_one',
            'password' => 'secret123',
        ]);

        $staff = Staff::create([
            'first_name' => 'Pending',
            'last_name' => 'Stylist',
            'email' => 'pending.stylist@example.com',
            'role' => 'stylist',
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
        ]);

        $response = $this->actingAs($admin, 'admin')->patchJson("/admin/staff/{$staff->id}/approve");

        $response->assertOk();
        $staff->refresh();

        $this->assertSame('approved', $staff->status);
        $this->assertNotNull($staff->approved_at);
        $this->assertSame($admin->id, $staff->approved_by_admin_id);
        $this->assertNotNull($staff->user_id);
        $this->assertDatabaseHas('stylists', [
            'id' => $staff->user_id,
            'name' => 'Pending Stylist',
            'role' => 'stylist',
        ]);
    }

    public function test_admin_can_reject_pending_staff_with_reason(): void
    {
        $manager = Manager::create([
            'name' => 'Manager One',
            'username' => 'manager_one',
            'password' => 'secret123',
            'active' => true,
        ]);

        $admin = Admin::create([
            'name' => 'Admin One',
            'email' => 'admin_one',
            'password' => 'secret123',
        ]);

        $staff = Staff::create([
            'first_name' => 'Reject',
            'last_name' => 'Me',
            'role' => 'stylist',
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
        ]);

        $response = $this->actingAs($admin, 'admin')->patchJson("/admin/staff/{$staff->id}/reject", [
            'rejected_reason' => 'Incomplete requirements.',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('staff', [
            'id' => $staff->id,
            'status' => 'rejected',
            'rejected_reason' => 'Incomplete requirements.',
        ]);
    }

    public function test_public_stylists_endpoint_returns_only_approved(): void
    {
        $manager = Manager::create([
            'name' => 'Manager One',
            'username' => 'manager_one',
            'password' => 'secret123',
            'active' => true,
        ]);

        $approvedStylist = Stylist::create([
            'name' => 'Approved Stylist',
            'email' => 'approved@example.com',
            'password' => 'secret123',
            'active' => true,
            'role' => 'stylist',
        ]);

        Staff::create([
            'user_id' => $approvedStylist->id,
            'first_name' => 'Approved',
            'last_name' => 'Stylist',
            'email' => 'approved@example.com',
            'role' => 'stylist',
            'status' => 'approved',
            'created_by_manager_id' => $manager->id,
            'approved_at' => now(),
        ]);

        Staff::create([
            'first_name' => 'Pending',
            'last_name' => 'Stylist',
            'email' => 'pending@example.com',
            'role' => 'stylist',
            'status' => 'pending',
            'created_by_manager_id' => $manager->id,
        ]);

        $response = $this->getJson('/api/stylists');

        $response->assertOk();
        $response->assertJsonFragment([
            'id' => $approvedStylist->id,
            'name' => 'Approved Stylist',
        ]);
        $response->assertJsonMissing([
            'name' => 'Pending Stylist',
        ]);
    }

    public function test_public_stylists_endpoint_keeps_legacy_active_stylists(): void
    {
        Stylist::create([
            'name' => 'Legacy Active Stylist',
            'email' => 'legacy.active@example.com',
            'password' => 'secret123',
            'active' => true,
            'role' => 'stylist',
        ]);

        $response = $this->getJson('/api/stylists');

        $response->assertOk();
        $response->assertJsonFragment([
            'name' => 'Legacy Active Stylist',
            'role' => 'stylist',
        ]);
    }
}
