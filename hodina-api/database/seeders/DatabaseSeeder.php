<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $guesthouse = Guesthouse::firstOrCreate(
            ['slug' => 'crama-din-codru'],
            [
                'name' => ['ro' => 'Crama din Codru', 'en' => 'Codru Winery', 'ru' => 'Винодельня Кодру'],
                'description' => [
                    'ro' => 'Pensiune si experiente locale in inima Moldovei.',
                    'en' => 'Guesthouse and local experiences in the heart of Moldova.',
                    'ru' => 'Гостевой дом и локальные впечатления в сердце Молдовы.',
                ],
                'public_email' => 'host@hodina.local',
                'public_phone' => '+37360000000',
                'locale' => 'ro',
                'currency' => 'MDL',
                'country' => 'Moldova',
                'city' => 'Orhei',
                'address' => 'Orheiul Vechi',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@hodina.md'],
            [
                'name' => 'Hodina Admin',
                'password' => 'Hodina@2026',
                'email_verified_at' => now(),
                'role' => User::ROLE_ADMIN,
                'locale' => 'ro',
                'timezone' => 'Europe/Chisinau',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'host@hodina.local'],
            [
                'name' => 'Host Demo',
                'password' => 'password',
                'email_verified_at' => now(),
                'role' => User::ROLE_HOST,
                'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
                'guesthouse_id' => $guesthouse->id,
                'locale' => 'ro',
                'timezone' => 'Europe/Chisinau',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'manager@hodina.local'],
            [
                'name' => 'Manager Demo',
                'password' => 'password',
                'email_verified_at' => now(),
                'role' => User::ROLE_HOST,
                'guesthouse_role' => User::GUESTHOUSE_ROLE_MANAGER,
                'guesthouse_id' => $guesthouse->id,
                'locale' => 'ro',
                'timezone' => 'Europe/Chisinau',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'guest@hodina.local'],
            [
                'name' => 'Guest Demo',
                'password' => 'password',
                'email_verified_at' => now(),
                'role' => User::ROLE_GUEST,
                'locale' => 'ro',
                'timezone' => 'Europe/Chisinau',
                'is_active' => true,
            ]
        );

        foreach ([
            ['type' => Category::TYPE_EXPERIENCE_CATEGORY, 'code' => 'wine-tasting', 'ro' => 'Degustari de vin', 'en' => 'Wine Tastings', 'ru' => 'Дегустации вин'],
            ['type' => Category::TYPE_EXPERIENCE_CATEGORY, 'code' => 'crafts', 'ro' => 'Ateliere traditionale', 'en' => 'Traditional Workshops', 'ru' => 'Традиционные мастер-классы'],
            ['type' => Category::TYPE_ACCOMMODATION_TYPE, 'code' => 'room', 'ro' => 'Camera', 'en' => 'Room', 'ru' => 'Комната'],
            ['type' => Category::TYPE_ACCOMMODATION_TYPE, 'code' => 'house', 'ro' => 'Casa intreaga', 'en' => 'Entire house', 'ru' => 'Дом целиком'],
            ['type' => Category::TYPE_AMENITY, 'code' => 'wifi', 'ro' => 'Wi-Fi', 'en' => 'Wi-Fi', 'ru' => 'Wi-Fi'],
            ['type' => Category::TYPE_AMENITY, 'code' => 'parking', 'ro' => 'Parcare', 'en' => 'Parking', 'ru' => 'Парковка'],
        ] as $item) {
            Category::firstOrCreate(
                ['type' => $item['type'], 'code' => $item['code']],
                [
                    'name' => ['ro' => $item['ro'], 'en' => $item['en'], 'ru' => $item['ru']],
                    'description' => null,
                    'slug' => [
                        'ro' => Str::slug($item['ro']),
                        'en' => Str::slug($item['en']),
                        'ru' => Str::slug($item['code']),
                    ],
                    'is_active' => true,
                ]
            );
        }
    }
}
