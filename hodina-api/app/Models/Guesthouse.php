<?php

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use App\Support\MediaUploader;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

class Guesthouse extends Model
{
    use HasApiTranslations, HasTranslations;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'public_email',
        'public_phone',
        'locale',
        'currency',
        'country',
        'city',
        'address',
        'latitude',
        'longitude',
        'cover_image',
        'gallery',
        'check_in_notes',
        'house_rules',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'settings' => 'array',
            'is_active' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public array $translatable = ['name', 'description', 'check_in_notes', 'house_rules'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(Experience::class);
    }

    public function accommodations(): HasMany
    {
        return $this->hasMany(Accommodation::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function calendarEvents(): HasMany
    {
        return $this->hasMany(CalendarEvent::class);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->translated('name', $locale),
            'description' => $this->translated('description', $locale),
            'public_email' => $this->public_email,
            'public_phone' => $this->public_phone,
            'locale' => $this->locale,
            'currency' => $this->currency,
            'country' => $this->country,
            'city' => $this->city,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'cover_image' => MediaUploader::url($this->cover_image),
            'gallery' => collect($this->gallery ?? [])->map(fn (?string $path) => MediaUploader::url($path) ?? $path)->values()->all(),
        ];
    }
}
