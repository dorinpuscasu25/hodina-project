<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Attribute;
use App\Models\AttributeValue;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Collection;

trait HasAttributeValues
{
    public function attributeValues(): MorphMany
    {
        return $this->morphMany(AttributeValue::class, 'attributable');
    }

    public function syncAttributeValues(array $payload): void
    {
        $normalizedPayload = $this->normalizePayloadShape($payload);

        $existing = $this->attributeValues()->get()->keyBy('attribute_id');
        $touched = [];

        foreach ($normalizedPayload as $attributeId => $rawValue) {
            $attribute = Attribute::query()->find((int) $attributeId);
            if (! $attribute) {
                continue;
            }

            $normalized = $this->normalizeAttributeValue($attribute, $rawValue);

            if ($normalized === null) {
                if ($existing->has($attribute->id)) {
                    $existing[$attribute->id]->delete();
                }
                continue;
            }

            if ($existing->has($attribute->id)) {
                $existing[$attribute->id]->fill($normalized)->save();
            } else {
                $this->attributeValues()->create(array_merge(
                    ['attribute_id' => $attribute->id],
                    $normalized,
                ));
            }

            $touched[] = $attribute->id;
        }

        $existing
            ->filter(fn (AttributeValue $value) => ! in_array($value->attribute_id, $touched, true))
            ->each(function (AttributeValue $value) use ($normalizedPayload) {
                if (array_key_exists((string) $value->attribute_id, $normalizedPayload)) {
                    return;
                }
                $value->delete();
            });
    }

    private function normalizePayloadShape(array $payload): array
    {
        if ($payload === []) {
            return [];
        }

        $isListOfObjects = array_is_list($payload)
            && is_array($payload[0] ?? null)
            && array_key_exists('attribute_id', $payload[0]);

        if ($isListOfObjects) {
            $normalized = [];
            foreach ($payload as $entry) {
                $attributeId = (int) ($entry['attribute_id'] ?? 0);
                if ($attributeId <= 0) {
                    continue;
                }
                $normalized[$attributeId] = $entry['value'] ?? null;
            }
            return $normalized;
        }

        return $payload;
    }

    public function attributeValuesArray(?string $locale = null): array
    {
        return $this->attributeValues()
            ->with('attribute.options')
            ->get()
            ->map(function (AttributeValue $value) use ($locale) {
                $attribute = $value->attribute;
                return [
                    'attribute_id' => $value->attribute_id,
                    'key' => $attribute?->key,
                    'label' => $attribute?->translated('label', $locale),
                    'input_type' => $attribute?->input_type,
                    'value' => $value->typedValue(),
                ];
            })
            ->values()
            ->all();
    }

    private function normalizeAttributeValue(Attribute $attribute, mixed $value): ?array
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }

        $base = [
            'value_string' => null,
            'value_number' => null,
            'value_boolean' => null,
            'value_json' => null,
        ];

        return match ($attribute->input_type) {
            Attribute::TYPE_BOOLEAN => array_merge($base, [
                'value_boolean' => (bool) $value,
            ]),
            Attribute::TYPE_NUMBER => array_merge($base, [
                'value_number' => (float) $value,
            ]),
            Attribute::TYPE_RANGE => array_merge($base, [
                'value_json' => is_array($value)
                    ? array_map(fn ($v) => (float) $v, $value)
                    : [(float) $value],
            ]),
            Attribute::TYPE_MULTISELECT => array_merge($base, [
                'value_json' => array_values((array) $value),
            ]),
            Attribute::TYPE_DATE => array_merge($base, [
                'value_string' => (string) $value,
            ]),
            default => array_merge($base, [
                'value_string' => is_array($value) ? json_encode($value) : (string) $value,
            ]),
        };
    }
}
