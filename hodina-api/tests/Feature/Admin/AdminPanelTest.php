<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
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
                'code' => 'fire-pit',
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

        $category = Category::query()->where('code', 'fire-pit')->firstOrFail();

        $this->assertSame('Vatra de foc', $category->getTranslation('name', 'ro'));
        $this->assertSame('Warm evenings', $category->getTranslation('description', 'en'));
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
}
