<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Attribute;
use Illuminate\Database\Seeder;

class AttributeSeeder extends Seeder
{
    public function run(): void
    {
        $blueprints = [
            [
                'key' => 'pet_friendly',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_BOTH,
                'label' => ['en' => 'Pet friendly', 'ro' => 'Pet friendly', 'ru' => 'Можно с животными'],
                'icon' => 'paw',
                'sort_order' => 10,
            ],
            [
                'key' => 'wifi',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_BOTH,
                'label' => ['en' => 'Wi-Fi', 'ro' => 'Wi-Fi', 'ru' => 'Wi-Fi'],
                'icon' => 'wifi',
                'sort_order' => 20,
            ],
            [
                'key' => 'parking',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_BOTH,
                'label' => ['en' => 'Parking', 'ro' => 'Parcare', 'ru' => 'Парковка'],
                'icon' => 'car',
                'sort_order' => 30,
            ],
            [
                'key' => 'kid_friendly',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_BOTH,
                'label' => ['en' => 'Kid friendly', 'ro' => 'Pentru copii', 'ru' => 'Подходит детям'],
                'icon' => 'baby',
                'sort_order' => 40,
            ],
            [
                'key' => 'breakfast_included',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_ACCOMMODATION,
                'label' => ['en' => 'Breakfast included', 'ro' => 'Mic dejun inclus', 'ru' => 'Завтрак включен'],
                'icon' => 'utensils',
                'sort_order' => 50,
            ],
            [
                'key' => 'pool',
                'input_type' => Attribute::TYPE_BOOLEAN,
                'entity_type' => Attribute::ENTITY_ACCOMMODATION,
                'label' => ['en' => 'Pool', 'ro' => 'Piscină', 'ru' => 'Бассейн'],
                'icon' => 'waves',
                'sort_order' => 60,
            ],
            [
                'key' => 'accessibility',
                'input_type' => Attribute::TYPE_MULTISELECT,
                'entity_type' => Attribute::ENTITY_BOTH,
                'label' => ['en' => 'Accessibility', 'ro' => 'Accesibilitate', 'ru' => 'Доступность'],
                'icon' => 'accessibility',
                'sort_order' => 70,
                'options' => [
                    ['value' => 'wheelchair', 'label' => ['en' => 'Wheelchair', 'ro' => 'Scaun cu rotile', 'ru' => 'Инвалидная коляска']],
                    ['value' => 'elevator', 'label' => ['en' => 'Elevator', 'ro' => 'Lift', 'ru' => 'Лифт']],
                    ['value' => 'stepfree', 'label' => ['en' => 'Step-free entry', 'ro' => 'Fără trepte', 'ru' => 'Без ступеней']],
                ],
            ],
            [
                'key' => 'difficulty',
                'input_type' => Attribute::TYPE_SELECT,
                'entity_type' => Attribute::ENTITY_EXPERIENCE,
                'label' => ['en' => 'Difficulty', 'ro' => 'Dificultate', 'ru' => 'Сложность'],
                'icon' => 'mountain',
                'sort_order' => 80,
                'options' => [
                    ['value' => 'easy', 'label' => ['en' => 'Easy', 'ro' => 'Ușor', 'ru' => 'Легко']],
                    ['value' => 'medium', 'label' => ['en' => 'Medium', 'ro' => 'Mediu', 'ru' => 'Средне']],
                    ['value' => 'hard', 'label' => ['en' => 'Hard', 'ro' => 'Dificil', 'ru' => 'Тяжело']],
                ],
            ],
            [
                'key' => 'languages',
                'input_type' => Attribute::TYPE_MULTISELECT,
                'entity_type' => Attribute::ENTITY_EXPERIENCE,
                'label' => ['en' => 'Languages', 'ro' => 'Limbi vorbite', 'ru' => 'Языки'],
                'icon' => 'languages',
                'sort_order' => 90,
                'options' => [
                    ['value' => 'ro', 'label' => ['en' => 'Romanian', 'ro' => 'Română', 'ru' => 'Румынский']],
                    ['value' => 'ru', 'label' => ['en' => 'Russian', 'ro' => 'Rusă', 'ru' => 'Русский']],
                    ['value' => 'en', 'label' => ['en' => 'English', 'ro' => 'Engleză', 'ru' => 'Английский']],
                ],
            ],
        ];

        foreach ($blueprints as $data) {
            $options = $data['options'] ?? [];
            unset($data['options']);

            $attribute = Attribute::query()->updateOrCreate(
                ['key' => $data['key']],
                array_merge([
                    'is_filterable' => true,
                    'is_required' => false,
                    'is_active' => true,
                ], $data),
            );

            foreach ($options as $index => $opt) {
                $attribute->options()->updateOrCreate(
                    ['value' => $opt['value']],
                    [
                        'label' => $opt['label'],
                        'sort_order' => $index,
                    ],
                );
            }
        }
    }
}
