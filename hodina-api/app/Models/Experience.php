<?php

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use App\Support\MediaUploader;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class Experience extends Model
{
    use HasApiTranslations, HasTranslations;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'guesthouse_id',
        'category_id',
        'status',
        'slug',
        'title',
        'short_description',
        'description',
        'location_name',
        'meeting_point',
        'address',
        'city',
        'country',
        'latitude',
        'longitude',
        'duration_minutes',
        'max_guests',
        'min_age',
        'difficulty',
        'price_amount',
        'currency',
        'price_mode',
        'default_start_time',
        'default_end_time',
        'available_days',
        'is_instant_book',
        'cover_image',
        'gallery',
        'video_url',
        'included_items',
        'excluded_items',
        'what_to_bring',
        'cancellation_policy',
        'important_notes',
    ];

    protected function casts(): array
    {
        return [
            'available_days' => 'array',
            'gallery' => 'array',
            'is_instant_book' => 'boolean',
            'price_amount' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public array $translatable = [
        'title',
        'short_description',
        'description',
        'meeting_point',
        'included_items',
        'excluded_items',
        'what_to_bring',
        'cancellation_policy',
        'important_notes',
    ];

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function recurrences(): HasMany
    {
        return $this->hasMany(ExperienceRecurrence::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ExperienceSession::class)->orderBy('starts_at');
    }

    public function bookings(): MorphMany
    {
        return $this->morphMany(Booking::class, 'bookable');
    }

    public function amenities(): MorphToMany
    {
        return $this->morphToMany(Category::class, 'categoryable')
            ->where('type', Category::TYPE_AMENITY)
            ->orderBy('sort_order');
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function toCardArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'status' => $this->status,
            'title' => $this->translated('title', $locale),
            'short_description' => $this->translated('short_description', $locale),
            'price_amount' => (float) $this->price_amount,
            'currency' => $this->currency,
            'duration_minutes' => $this->duration_minutes,
            'max_guests' => $this->max_guests,
            'city' => $this->city,
            'country' => $this->country,
            'cover_image' => MediaUploader::url($this->cover_image),
            'category' => $this->category?->toApiArray($locale),
            'guesthouse' => $this->guesthouse?->toApiArray($locale),
        ];
    }

    public function toDetailArray(?string $locale = null): array
    {
        return array_merge($this->toCardArray($locale), [
            'description' => $this->translated('description', $locale),
            'meeting_point' => $this->translated('meeting_point', $locale),
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'difficulty' => $this->difficulty,
            'min_age' => $this->min_age,
            'price_mode' => $this->price_mode,
            'default_start_time' => $this->default_start_time,
            'default_end_time' => $this->default_end_time,
            'available_days' => $this->available_days ?? [],
            'gallery' => collect($this->gallery ?? [])->map(fn (?string $path) => MediaUploader::url($path) ?? $path)->values()->all(),
            'video_url' => $this->video_url,
            'included_items' => $this->translated('included_items', $locale) ?? [],
            'excluded_items' => $this->translated('excluded_items', $locale) ?? [],
            'what_to_bring' => $this->translated('what_to_bring', $locale) ?? [],
            'cancellation_policy' => $this->translated('cancellation_policy', $locale),
            'important_notes' => $this->translated('important_notes', $locale),
            'amenities' => $this->amenities->map(fn (Category $amenity) => $amenity->toApiArray($locale))->values(),
        ]);
    }
}
