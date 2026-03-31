<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_register_via_api(): void
    {
        $response = $this->postJson('/api/v1/client/auth/register', [
            'name' => 'API Guest',
            'email' => 'api-guest@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'locale' => 'ro',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'api-guest@example.com')
            ->assertJsonPath('data.user.role', 'guest')
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user',
                    'requires_email_verification',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'api-guest@example.com',
            'role' => 'guest',
        ]);
    }
}
