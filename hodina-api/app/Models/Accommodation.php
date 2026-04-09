<?php

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use App\Support\MediaUploader;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Carbon;
use Spatie\Translatable\HasTranslations;

class Accommodation extends Model
{
    use HasApiTranslations, HasTranslations;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'guesthouse_id',
        'type_id',
        'status',
        'slug',
        'title',
        'short_description',
        'description',
        'address',
        'city',
        'country',
        'latitude',
        'longitude',
        'max_guests',
        'bedrooms',
        'beds',
        'bathrooms',
        'units_total',
        'min_nights',
        'max_nights',
        'nightly_rate',
        'cleaning_fee',
        'currency',
        'check_in_from',
        'check_out_until',
        'is_instant_book',
        'cover_image',
        'gallery',
        'highlights',
        'house_rules',
        'cancellation_policy',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'highlights' => 'array',
            'is_instant_book' => 'boolean',
            'nightly_rate' => 'decimal:2',
            'cleaning_fee' => 'decimal:2',
            'bathrooms' => 'decimal:1',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public array $translatable = [
        'title',
        'short_description',
        'description',
        'highlights',
        'house_rules',
        'cancellation_policy',
    ];

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'type_id');
    }

    public function bookings(): MorphMany
    {
        return $this->morphMany(Booking::class, 'bookable');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable')->latest('published_at');
    }

    public function calendarEvents(): MorphMany
    {
        return $this->morphMany(CalendarEvent::class, 'bookable');
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

    public function availableUnitsBetween(Carbon|string $startsAt, Carbon|string $endsAt): int
    {
        $startsAt = $startsAt instanceof Carbon ? $startsAt : Carbon::parse($startsAt);
        $endsAt = $endsAt instanceof Carbon ? $endsAt : Carbon::parse($endsAt);

        $bookedUnits = $this->bookings()
            ->whereIn('status', Booking::activeStatuses())
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->sum('units');

        $blockedUnits = $this->calendarEvents()
            ->where('blocks_inventory', true)
            ->where('starts_at', '<', $endsAt)
            ->where('ends_at', '>', $startsAt)
            ->sum('units_blocked');

        return max($this->units_total - $bookedUnits - $blockedUnits, 0);
    }

    public function toCardArray(?string $locale = null): array
    {
        $reviews = $this->relationLoaded('reviews') ? $this->reviews : null;

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'status' => $this->status,
            'title' => $this->translated('title', $locale),
            'short_description' => $this->translated('short_description', $locale),
            'nightly_rate' => (float) $this->nightly_rate,
            'cleaning_fee' => (float) $this->cleaning_fee,
            'currency' => $this->currency,
            'city' => $this->city,
            'country' => $this->country,
            'max_guests' => $this->max_guests,
            'bedrooms' => $this->bedrooms,
            'beds' => $this->beds,
            'bathrooms' => (float) $this->bathrooms,
            'units_total' => $this->units_total,
            'cover_image' => MediaUploader::url($this->cover_image),
            'guesthouse' => $this->guesthouse?->toApiArray($locale),
            'type' => $this->type?->toApiArray($locale),
            'rating_average' => $reviews?->avg('rating'),
            'reviews_count' => $reviews?->count() ?? 0,
        ];
    }

    public function toDetailArray(?string $locale = null): array
    {
        return array_merge($this->toCardArray($locale), [
            'description' => $this->translated('description', $locale),
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'min_nights' => $this->min_nights,
            'max_nights' => $this->max_nights,
            'check_in_from' => $this->check_in_from,
            'check_out_until' => $this->check_out_until,
            'gallery' => collect($this->gallery ?? [])->map(fn (?string $path) => MediaUploader::url($path) ?? $path)->values()->all(),
            'highlights' => $this->translated('highlights', $locale) ?? [],
            'house_rules' => $this->translated('house_rules', $locale) ?? [],
            'cancellation_policy' => $this->translated('cancellation_policy', $locale),
            'amenities' => $this->amenities->map(fn (Category $amenity) => $amenity->toApiArray($locale))->values(),
            'reviews' => $this->relationLoaded('reviews')
                ? $this->reviews->map(fn (Review $review) => $review->toApiArray())->values()
                : [],
        ]);
    }
}
