<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class Attribute extends Model
{
    use HasApiTranslations, HasTranslations;

    public const TYPE_TEXT = 'text';
    public const TYPE_NUMBER = 'number';
    public const TYPE_BOOLEAN = 'boolean';
    public const TYPE_SELECT = 'select';
    public const TYPE_MULTISELECT = 'multiselect';
    public const TYPE_RADIO = 'radio';
    public const TYPE_RANGE = 'range';
    public const TYPE_DATE = 'date';

    public const ENTITY_EXPERIENCE = 'experience';
    public const ENTITY_ACCOMMODATION = 'accommodation';
    public const ENTITY_BOTH = 'both';

    public array $translatable = ['label', 'description'];

    protected $fillable = [
        'key',
        'input_type',
        'entity_type',
        'label',
        'description',
        'unit',
        'config',
        'icon',
        'is_filterable',
        'is_required',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'is_filterable' => 'boolean',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public static function inputTypes(): array
    {
        return [
            self::TYPE_TEXT,
            self::TYPE_NUMBER,
            self::TYPE_BOOLEAN,
            self::TYPE_SELECT,
            self::TYPE_MULTISELECT,
            self::TYPE_RADIO,
            self::TYPE_RANGE,
            self::TYPE_DATE,
        ];
    }

    public static function entityTypes(): array
    {
        return [
            self::ENTITY_EXPERIENCE,
            self::ENTITY_ACCOMMODATION,
            self::ENTITY_BOTH,
        ];
    }

    public function options(): HasMany
    {
        return $this->hasMany(AttributeOption::class)->orderBy('sort_order')->orderBy('id');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'attribute_category');
    }

    public function values(): HasMany
    {
        return $this->hasMany(AttributeValue::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForEntity($query, string $entity)
    {
        return $query->whereIn('entity_type', [$entity, self::ENTITY_BOTH]);
    }

    public function scopeFilterable($query)
    {
        return $query->where('is_filterable', true);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'input_type' => $this->input_type,
            'entity_type' => $this->entity_type,
            'label' => $this->translated('label', $locale),
            'description' => $this->translated('description', $locale),
            'unit' => $this->unit,
            'icon' => $this->icon,
            'config' => $this->config ?? [],
            'is_filterable' => $this->is_filterable,
            'is_required' => $this->is_required,
            'sort_order' => $this->sort_order,
            'options' => $this->relationLoaded('options')
                ? $this->options->map(fn (AttributeOption $option) => $option->toApiArray($locale))->values()->all()
                : [],
        ];
    }
}
