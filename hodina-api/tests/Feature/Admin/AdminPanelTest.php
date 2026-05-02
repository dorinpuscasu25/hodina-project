<?php

namespace Tests\Feature\Admin;

use App\Models\Accommodation;
use App\Models\Category;
use App\Models\Experience;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_users_cannot_access_the_admin_panel(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/admin')
            ->assertForbidden();
    }

    public function test_admin_users_can_open_the_custom_admin_dashboard(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk();
    }

    public function test_admin_can_create_a_multilingual_category(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post('/admin/categories', [
                'type' => Category::TYPE_AMENITY,
                'name' => [
                    'en' => 'Fire pit',
                    'ro' => 'Vatra de foc',
                    'ru' => 'Костровое место',
                ],
                'description' => [
                    'en' => 'Warm evenings',
                    'ro' => 'Seri calde',
                    'ru' => 'Теплые вечера',
                ],
                'card_background' => '#eefbf2',
                'accent_color' => '#0f8f47',
                'sort_order' => 10,
                'is_active' => true,
            ])
            ->assertRedirect('/admin/categories');

        $category = Category::query()->firstOrFail();

        $this->assertSame('Vatra de foc', $category->getTranslation('name', 'ro'));
        $this->assertSame('Warm evenings', $category->getTranslation('description', 'en'));
    }

    public function test_admin_can_edit_an_existing_category(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::query()->create([
            'type' => Category::TYPE_EXPERIENCE_CATEGORY,
            'name' => [
                'en' => 'Old name',
                'ro' => 'Nume vechi',
                'ru' => 'Старое имя',
            ],
            'description' => null,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->actingAs($admin)
            ->post("/admin/categories/{$category->id}", [
                '_method' => 'patch',
                'type' => Category::TYPE_EXPERIENCE_CATEGORY,
                'parent_id' => '',
                'name' => [
                    'en' => 'New name',
                    'ro' => 'Nume nou',
                    'ru' => '',
                ],
                'description' => [
                    'en' => 'Updated description',
                    'ro' => '',
                    'ru' => '',
                ],
                'card_background' => '#ffffff',
                'accent_color' => '#111111',
                'sort_order' => 7,
                'is_active' => '0',
                'remove_image' => 'false',
            ])
            ->assertRedirect('/admin/categories');

        $category->refresh();

        $this->assertSame('Nume nou', $category->getTranslation('name', 'ro'));
        $this->assertSame('Updated description', $category->getTranslation('description', 'en'));
        $this->assertFalse($category->is_active);
        $this->assertSame(7, $category->sort_order);
    }

    public function test_admin_can_create_a_guesthouse_profile(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post('/admin/guesthouses', [
                'name' => [
                    'en' => 'Forest Retreat',
                    'ro' => 'Refugiul din Padure',
                    'ru' => '',
                ],
                'description' => [
                    'en' => 'Hidden near the hills.',
                    'ro' => 'Ascunsa intre dealuri.',
                    'ru' => '',
                ],
                'check_in_notes' => [
                    'en' => 'Call before arrival',
                    'ro' => 'Sunati inainte de sosire',
                    'ru' => '',
                ],
                'house_rules' => [
                    'en' => 'No smoking indoors',
                    'ro' => 'Fumatul interzis in interior',
                    'ru' => '',
                ],
                'slug' => '',
                'public_email' => 'retreat@example.test',
                'public_phone' => '+37360000000',
                'locale' => 'ro',
                'currency' => 'MDL',
                'country' => 'Moldova',
                'city' => 'Orhei',
                'address' => 'Strada Codrilor 10',
                'latitude' => '47.378',
                'longitude' => '28.824',
                'cover_image' => 'https://example.test/cover.jpg',
                'is_active' => true,
            ])
            ->assertRedirect('/admin/guesthouses');

        $guesthouse = Guesthouse::query()->where('public_email', 'retreat@example.test')->firstOrFail();

        $this->assertSame('Refugiul din Padure', $guesthouse->getTranslation('name', 'ro'));
        $this->assertSame('refugiul-din-padure', $guesthouse->slug);
    }

    public function test_admin_can_create_a_host_user_and_trigger_email_verification(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $guesthouse = Guesthouse::query()->create([
            'name' => [
                'en' => 'Host House',
                'ro' => 'Casa Gazdei',
                'ru' => 'Дом хозяина',
            ],
            'slug' => 'casa-gazdei',
            'description' => null,
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->post('/admin/users', [
                'name' => 'Host Manager',
                'email' => 'host.manager@example.test',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role' => User::ROLE_HOST,
                'phone' => '+37369999999',
                'locale' => 'ro',
                'timezone' => 'Europe/Chisinau',
                'guesthouse_id' => $guesthouse->id,
                'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
                'is_active' => true,
            ])
            ->assertRedirect('/admin/users');

        $host = User::query()->where('email', 'host.manager@example.test')->firstOrFail();

        $this->assertSame(User::ROLE_HOST, $host->role);
        $this->assertSame($guesthouse->id, $host->guesthouse_id);

        Notification::assertSentTo($host, VerifyEmail::class);
    }

    public function test_admin_can_publish_a_guesthouse_experience(): void
    {
        $admin = User::factory()->admin()->create();
        $guesthouse = Guesthouse::query()->create([
            'name' => ['ro' => 'Pensiunea Codrilor'],
            'slug' => 'pensiunea-codrilor',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $experience = Experience::query()->create([
            'guesthouse_id' => $guesthouse->id,
            'status' => Experience::STATUS_DRAFT,
            'slug' => 'degustare-la-stana',
            'title' => ['ro' => 'Degustare la stana'],
            'country' => 'Moldova',
            'duration_minutes' => 120,
            'max_guests' => 8,
            'price_amount' => 450,
            'currency' => 'MDL',
            'price_mode' => 'per_person',
        ]);

        $this->actingAs($admin)
            ->patch("/admin/guesthouses/{$guesthouse->id}/experiences/{$experience->id}/status", [
                'status' => Experience::STATUS_PUBLISHED,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('experiences', [
            'id' => $experience->id,
            'status' => Experience::STATUS_PUBLISHED,
        ]);
    }

    public function test_admin_can_publish_a_guesthouse_accommodation(): void
    {
        $admin = User::factory()->admin()->create();
        $guesthouse = Guesthouse::query()->create([
            'name' => ['ro' => 'Pensiunea Nistrului'],
            'slug' => 'pensiunea-nistrului',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'is_active' => true,
        ]);

        $accommodation = Accommodation::query()->create([
            'guesthouse_id' => $guesthouse->id,
            'status' => Accommodation::STATUS_DRAFT,
            'slug' => 'casa-mare',
            'title' => ['ro' => 'Casa mare'],
            'country' => 'Moldova',
            'max_guests' => 4,
            'bedrooms' => 2,
            'beds' => 2,
            'bathrooms' => 1,
            'units_total' => 1,
            'min_nights' => 1,
            'nightly_rate' => 1200,
            'cleaning_fee' => 0,
            'currency' => 'MDL',
        ]);

        $this->actingAs($admin)
            ->patch("/admin/guesthouses/{$guesthouse->id}/accommodations/{$accommodation->id}/status", [
                'status' => Accommodation::STATUS_PUBLISHED,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('accommodations', [
            'id' => $accommodation->id,
            'status' => Accommodation::STATUS_PUBLISHED,
        ]);
    }
}
