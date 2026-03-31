<?php

namespace Tests\Feature\Api;

use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HostOrganizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_owner_can_view_and_manage_organization_members(): void
    {
        $guesthouse = Guesthouse::create([
            'name' => ['ro' => 'Pensiunea Echipa'],
            'slug' => 'pensiunea-echipa',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $owner = User::factory()->host()->create([
            'guesthouse_id' => $guesthouse->id,
            'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/host/organization')
            ->assertOk()
            ->assertJsonPath('data.guesthouse.slug', 'pensiunea-echipa')
            ->assertJsonPath('data.permissions.can_manage_team', true)
            ->assertJsonPath('data.availability.summary.accommodation_count', 0);

        $this->postJson('/api/v1/host/organization/members', [
            'name' => 'Editor Team',
            'email' => 'editor@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'guesthouse_role' => User::GUESTHOUSE_ROLE_EDITOR,
            'locale' => 'ro',
            'timezone' => 'Europe/Chisinau',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.guesthouse_role', User::GUESTHOUSE_ROLE_EDITOR)
            ->assertJsonPath('data.role', User::ROLE_HOST);

        $member = User::query()->where('email', 'editor@example.test')->firstOrFail();

        $this->patchJson("/api/v1/host/organization/members/{$member->id}", [
            'guesthouse_role' => User::GUESTHOUSE_ROLE_MANAGER,
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.guesthouse_role', User::GUESTHOUSE_ROLE_MANAGER);

        $this->patchJson('/api/v1/host/organization', [
            'name' => 'Pensiunea Echipa Noua',
            'description' => 'Loc bun pentru grupuri.',
            'public_email' => 'office@example.test',
            'public_phone' => '+37360000001',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'city' => 'Orhei',
            'address' => 'Strada Teiului 10',
            'check_in_notes' => 'Sunati la sosire.',
            'house_rules' => 'Liniste dupa ora 22.',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Pensiunea Echipa Noua')
            ->assertJsonPath('data.city', 'Orhei');

        $this->patchJson('/api/v1/host/organization/availability', [
            'working_days' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            'opening_time' => '08:00',
            'closing_time' => '20:00',
            'days_off' => ['2026-12-25', '2026-12-31'],
            'note' => 'Confirmăm telefonic în zilele aglomerate.',
        ])
            ->assertOk()
            ->assertJsonPath('data.opening_time', '08:00')
            ->assertJsonPath('data.days_off.0', '2026-12-25');
    }

    public function test_guesthouse_viewer_cannot_manage_team_members(): void
    {
        $guesthouse = Guesthouse::create([
            'name' => ['ro' => 'Pensiunea Viewer'],
            'slug' => 'pensiunea-viewer',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $viewer = User::factory()->host()->create([
            'guesthouse_id' => $guesthouse->id,
            'guesthouse_role' => User::GUESTHOUSE_ROLE_VIEWER,
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($viewer);

        $this->postJson('/api/v1/host/organization/members', [
            'name' => 'Blocked User',
            'email' => 'blocked@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'guesthouse_role' => User::GUESTHOUSE_ROLE_EDITOR,
        ])->assertForbidden();
    }
}
