<?php

namespace Tests\Feature;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminLoginHashMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_with_non_bcrypt_hash_and_password_is_upgraded(): void
    {
        $legacyHash = password_hash('admin123', PASSWORD_ARGON2ID);

        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin',
            'password' => $legacyHash,
        ]);

        $response = $this->postJson('/login', [
            'email' => 'admin',
            'password' => 'admin123',
            'type' => 'admin',
        ]);

        $response->assertOk()
            ->assertJsonPath('type', 'admin');

        $admin->refresh();

        $this->assertNotSame($legacyHash, $admin->password);
        $this->assertTrue(Hash::check('admin123', $admin->password));
    }
}
