<?php

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use App\Support\MediaUploader;
use Spatie\Sluggable\HasTranslatableSlug;
use Spatie\Translatable\HasTranslations;
use Spatie\Sluggable\SlugOptions;

class Category extends Model
{
    use HasApiTranslations, HasTranslations, HasTranslatableSlug;

    public const TYPE_EXPERIENCE_CATEGORY = 'experience_category';
    public const TYPE_ACCOMMODATION_TYPE = 'accommodation_type';
    public const TYPE_AMENITY = 'amenity';

    protected $fillable = [
        'type',
        'code',
        'parent_id',
        'name',
        'description',
        'slug',
        'image',
        'is_active',
        'sort_order',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'settings' => 'array',
        ];
    }

    public array $translatable = ['name', 'slug', 'description', 'meta_title', 'meta_description', 'meta_keywords'];

    public function getSlugOptions() : SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function childrenRecursive(): HasMany
    {
        return $this->children()
            ->active()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->with('childrenRecursive');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'code' => $this->code,
            'parent_id' => $this->parent_id,
            'name' => $this->translated('name', $locale),
            'description' => $this->translated('description', $locale),
            'slug' => $this->translated('slug', $locale),
            'image' => MediaUploader::url($this->image),
            'sort_order' => $this->sort_order,
            'settings' => $this->settings ?? [],
            'children' => $this->relationLoaded('children')
                ? $this->children->map(fn (self $child) => $child->toApiArray($locale))->values()->all()
                : [],
        ];
    }

    public function toNestedApiArray(?string $locale = null): array
    {
        return [
            ...$this->toApiArray($locale),
            'children' => $this->relationLoaded('childrenRecursive')
                ? $this->childrenRecursive->map(fn (self $child) => $child->toNestedApiArray($locale))->values()->all()
                : (
                    $this->relationLoaded('children')
                        ? $this->children->map(fn (self $child) => $child->toNestedApiArray($locale))->values()->all()
                        : []
                ),
        ];
    }
}
