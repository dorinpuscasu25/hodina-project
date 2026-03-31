<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class ExperienceSession extends Model
{
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_BLOCKED = 'blocked';

    protected $fillable = [
        'experience_id',
        'experience_recurrence_id',
        'starts_at',
        'ends_at',
        'capacity',
        'reserved_guests',
        'status',
        'is_manual',
        'title_override',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_manual' => 'boolean',
        ];
    }

    public function experience(): BelongsTo
    {
        return $this->belongsTo(Experience::class);
    }

    public function recurrence(): BelongsTo
    {
        return $this->belongsTo(ExperienceRecurrence::class, 'experience_recurrence_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'experience_session_id');
    }

    public function spotsLeft(): int
    {
        return max($this->capacity - $this->reserved_guests, 0);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'experience_id' => $this->experience_id,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'capacity' => $this->capacity,
            'reserved_guests' => $this->reserved_guests,
            'spots_left' => $this->spotsLeft(),
            'status' => $this->status,
            'is_manual' => $this->is_manual,
            'title' => $this->title_override ?: $this->experience?->translated('title', $locale),
        ];
    }
}
