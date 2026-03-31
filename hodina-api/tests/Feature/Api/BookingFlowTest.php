<?php

namespace Tests\Feature\Api;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Experience;
use App\Models\ExperienceSession;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_experience_and_guesthouse_pages_can_be_loaded_by_slug(): void
    {
        $guesthouse = Guesthouse::create([
            'name' => ['ro' => 'Pensiunea Demo'],
            'slug' => 'pensiunea-demo',
            'description' => ['ro' => 'O pensiune locală.'],
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $category = Category::create([
            'type' => Category::TYPE_EXPERIENCE_CATEGORY,
            'code' => 'wine',
            'name' => ['ro' => 'Vin'],
            'slug' => ['ro' => 'vin'],
            'is_active' => true,
        ]);

        Experience::create([
            'guesthouse_id' => $guesthouse->id,
            'category_id' => $category->id,
            'status' => Experience::STATUS_PUBLISHED,
            'slug' => 'degustare-vin',
            'title' => ['ro' => 'Degustare de vin'],
            'price_amount' => 500,
            'currency' => 'MDL',
            'price_mode' => 'per_person',
            'duration_minutes' => 120,
            'max_guests' => 10,
            'difficulty' => 'easy',
        ]);

        $this->getJson('/api/v1/public/experiences/degustare-vin?locale=ro')
            ->assertOk()
            ->assertJsonPath('data.slug', 'degustare-vin')
            ->assertJsonPath('data.title', 'Degustare de vin');

        $this->getJson('/api/v1/public/guesthouses/pensiunea-demo?locale=ro')
            ->assertOk()
            ->assertJsonPath('data.guesthouse.slug', 'pensiunea-demo')
            ->assertJsonPath('data.guesthouse.name', 'Pensiunea Demo')
            ->assertJsonPath('data.counts.experiences', 1);
    }

    public function test_guest_can_book_experience_and_host_can_confirm_then_chat(): void
    {
        $guesthouse = Guesthouse::create([
            'name' => ['ro' => 'Pensiunea Demo'],
            'slug' => 'pensiunea-demo',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $category = Category::create([
            'type' => Category::TYPE_EXPERIENCE_CATEGORY,
            'code' => 'wine',
            'name' => ['ro' => 'Vin'],
            'slug' => ['ro' => 'vin'],
            'is_active' => true,
        ]);

        $host = User::factory()->host()->create([
            'guesthouse_id' => $guesthouse->id,
            'email_verified_at' => now(),
        ]);

        $guest = User::factory()->withoutTwoFactor()->create([
            'role' => User::ROLE_GUEST,
            'email_verified_at' => now(),
        ]);

        $experience = Experience::create([
            'guesthouse_id' => $guesthouse->id,
            'category_id' => $category->id,
            'status' => Experience::STATUS_PUBLISHED,
            'slug' => 'degustare-vin',
            'title' => ['ro' => 'Degustare de vin'],
            'price_amount' => 500,
            'currency' => 'MDL',
            'price_mode' => 'per_person',
            'duration_minutes' => 120,
            'max_guests' => 10,
            'difficulty' => 'easy',
        ]);

        $session = ExperienceSession::create([
            'experience_id' => $experience->id,
            'starts_at' => now()->addDays(5)->setTime(14, 0),
            'ends_at' => now()->addDays(5)->setTime(16, 0),
            'capacity' => 10,
            'reserved_guests' => 0,
            'status' => ExperienceSession::STATUS_SCHEDULED,
            'is_manual' => true,
        ]);

        Sanctum::actingAs($guest);

        $bookingResponse = $this->postJson("/api/v1/client/bookings/experiences/{$session->id}", [
            'adults' => 2,
            'children' => 0,
            'infants' => 0,
            'contact_name' => 'Ion Test',
            'contact_email' => 'ion@example.com',
            'contact_phone' => '+37360000000',
        ]);

        $bookingResponse
            ->assertCreated()
            ->assertJsonPath('data.status', Booking::STATUS_PENDING);

        $bookingId = $bookingResponse->json('data.id');

        Sanctum::actingAs($host);

        $confirmResponse = $this->postJson("/api/v1/host/bookings/{$bookingId}/confirm", [
            'host_response' => 'Te asteptam cu drag.',
        ]);

        $confirmResponse
            ->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_CONFIRMED)
            ->assertJsonPath('data.chat_enabled', true);

        Sanctum::actingAs($guest);

        $messageResponse = $this->postJson("/api/v1/client/bookings/{$bookingId}/messages", [
            'body' => 'Multumesc, ajungem la timp.',
        ]);

        $messageResponse
            ->assertCreated()
            ->assertJsonPath('data.body', 'Multumesc, ajungem la timp.');
    }
}
