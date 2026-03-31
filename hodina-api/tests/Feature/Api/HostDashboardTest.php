<?php

namespace Tests\Feature\Api;

use App\Models\Accommodation;
use App\Models\CalendarEvent;
use App\Models\Category;
use App\Models\Experience;
use App\Models\ExperienceSession;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HostDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_can_update_profile_and_manage_manual_calendar_items(): void
    {
        $guesthouse = Guesthouse::create([
            'name' => ['ro' => 'Pensiunea Calendar'],
            'slug' => 'pensiunea-calendar',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'city' => 'Orhei',
            'is_active' => true,
        ]);

        $category = Category::create([
            'type' => Category::TYPE_EXPERIENCE_CATEGORY,
            'code' => 'walk',
            'name' => ['ro' => 'Plimbare'],
            'slug' => ['ro' => 'plimbare'],
            'is_active' => true,
        ]);

        $host = User::factory()->host()->create([
            'guesthouse_id' => $guesthouse->id,
            'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
            'email_verified_at' => now(),
        ]);

        $experience = Experience::create([
            'guesthouse_id' => $guesthouse->id,
            'category_id' => $category->id,
            'status' => Experience::STATUS_PUBLISHED,
            'slug' => 'tur-la-rasarit',
            'title' => ['ro' => 'Tur la răsărit'],
            'price_amount' => 300,
            'currency' => 'MDL',
            'price_mode' => 'per_person',
            'duration_minutes' => 90,
            'max_guests' => 8,
            'difficulty' => 'easy',
        ]);

        $session = ExperienceSession::create([
            'experience_id' => $experience->id,
            'starts_at' => now()->addDays(3)->setTime(8, 0),
            'ends_at' => now()->addDays(3)->setTime(10, 0),
            'capacity' => 8,
            'reserved_guests' => 0,
            'status' => ExperienceSession::STATUS_SCHEDULED,
            'is_manual' => true,
            'title_override' => 'Tur devreme',
            'note' => 'Întâlnire în curte.',
        ]);

        $accommodation = Accommodation::create([
            'guesthouse_id' => $guesthouse->id,
            'status' => Accommodation::STATUS_PUBLISHED,
            'slug' => 'camera-verde',
            'title' => ['ro' => 'Camera verde'],
            'currency' => 'MDL',
            'units_total' => 3,
        ]);

        $event = CalendarEvent::create([
            'guesthouse_id' => $guesthouse->id,
            'bookable_type' => Accommodation::class,
            'bookable_id' => $accommodation->id,
            'kind' => CalendarEvent::KIND_MAINTENANCE,
            'title' => 'Revizie',
            'description' => 'Blocare scurtă.',
            'starts_at' => now()->addDays(4)->setTime(12, 0),
            'ends_at' => now()->addDays(4)->setTime(14, 0),
            'blocks_inventory' => true,
            'units_blocked' => 2,
        ]);

        Sanctum::actingAs($host);

        $this->patchJson('/api/v1/auth/me', [
            'name' => 'Host Actualizat',
            'phone' => '+37360000001',
            'locale' => 'ro',
            'timezone' => 'Europe/Chisinau',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'Host Actualizat')
            ->assertJsonPath('data.user.phone', '+37360000001');

        $this->patchJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'passwordNou123',
            'password_confirmation' => 'passwordNou123',
        ])->assertOk();

        $this->getJson('/api/v1/host/calendar')
            ->assertOk()
            ->assertJsonPath('data.sessions.0.entity_id', $session->id)
            ->assertJsonPath('data.sessions.0.editable', true)
            ->assertJsonPath('data.events.0.entity_id', $event->id)
            ->assertJsonPath('data.events.0.deletable', true);

        $this->patchJson("/api/v1/host/calendar/sessions/{$session->id}", [
            'title' => 'Tur actualizat',
            'description' => 'Întâlnire la recepție.',
            'starts_at' => now()->addDays(3)->setTime(9, 0)->toIso8601String(),
            'ends_at' => now()->addDays(3)->setTime(11, 0)->toIso8601String(),
            'capacity' => 10,
            'status' => ExperienceSession::STATUS_BLOCKED,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Tur actualizat')
            ->assertJsonPath('data.status', ExperienceSession::STATUS_BLOCKED)
            ->assertJsonPath('data.capacity', 10);

        $this->patchJson("/api/v1/host/calendar/events/{$event->id}", [
            'kind' => CalendarEvent::KIND_CUSTOM,
            'title' => 'Eveniment privat',
            'description' => 'Salon rezervat.',
            'starts_at' => now()->addDays(4)->setTime(13, 0)->toIso8601String(),
            'ends_at' => now()->addDays(4)->setTime(16, 0)->toIso8601String(),
            'blocks_inventory' => true,
            'units_blocked' => 1,
            'accommodation_id' => $accommodation->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Eveniment privat')
            ->assertJsonPath('data.type', CalendarEvent::KIND_CUSTOM)
            ->assertJsonPath('data.units_blocked', 1);

        $this->deleteJson("/api/v1/host/calendar/events/{$event->id}")
            ->assertOk();

        $this->deleteJson("/api/v1/host/calendar/sessions/{$session->id}")
            ->assertOk();

        $this->assertDatabaseMissing('calendar_events', [
            'id' => $event->id,
        ]);

        $this->assertDatabaseMissing('experience_sessions', [
            'id' => $session->id,
        ]);
    }
}
