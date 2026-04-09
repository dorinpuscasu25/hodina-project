<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Booking extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_COMPLETED = 'completed';
    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_PAID = 'paid';
    public const PAYMENT_REFUNDED = 'refunded';

    protected $fillable = [
        'booking_number',
        'guesthouse_id',
        'guest_user_id',
        'experience_session_id',
        'bookable_type',
        'bookable_id',
        'status',
        'starts_at',
        'ends_at',
        'adults',
        'children',
        'infants',
        'units',
        'currency',
        'subtotal_amount',
        'total_amount',
        'payment_status',
        'paid_amount',
        'refunded_amount',
        'contact_name',
        'contact_email',
        'contact_phone',
        'special_requests',
        'host_response',
        'paid_at',
        'refunded_at',
        'confirmed_at',
        'rejected_at',
        'cancelled_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'subtotal_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'rejected_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $booking): void {
            if (! $booking->booking_number) {
                $booking->booking_number = 'HDN-'.Str::upper(Str::random(10));
            }
        });
    }

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guest_user_id');
    }

    public function experienceSession(): BelongsTo
    {
        return $this->belongsTo(ExperienceSession::class);
    }

    public function bookable(): MorphTo
    {
        return $this->morphTo();
    }

    public function conversation(): HasOne
    {
        return $this->hasOne(BookingConversation::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public static function activeStatuses(): array
    {
        return [self::STATUS_PENDING, self::STATUS_CONFIRMED];
    }

    public function partySize(): int
    {
        return $this->adults + $this->children;
    }

    public function isChatEnabled(): bool
    {
        return $this->status === self::STATUS_CONFIRMED || $this->status === self::STATUS_COMPLETED;
    }

    public function isReviewEligible(?Carbon $reference = null): bool
    {
        $reference ??= now();

        return in_array($this->status, [self::STATUS_CONFIRMED, self::STATUS_COMPLETED], true)
            && $this->ends_at !== null
            && $this->ends_at->lte($reference);
    }

    public function netPaidAmount(): float
    {
        return max((float) $this->paid_amount - (float) $this->refunded_amount, 0);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'booking_number' => $this->booking_number,
            'status' => $this->status,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'adults' => $this->adults,
            'children' => $this->children,
            'infants' => $this->infants,
            'units' => $this->units,
            'currency' => $this->currency,
            'subtotal_amount' => (float) $this->subtotal_amount,
            'total_amount' => (float) $this->total_amount,
            'payment_status' => $this->payment_status,
            'paid_amount' => (float) $this->paid_amount,
            'refunded_amount' => (float) $this->refunded_amount,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'special_requests' => $this->special_requests,
            'host_response' => $this->host_response,
            'chat_enabled' => $this->isChatEnabled(),
            'can_review' => $this->isReviewEligible() && ! $this->relationLoaded('review')
                ? ! $this->review()->exists()
                : $this->isReviewEligible() && $this->review === null,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'guest' => $this->guest?->toApiArray(),
            'guesthouse' => $this->guesthouse?->toApiArray($locale),
            'bookable_type' => class_basename((string) $this->bookable_type),
            'bookable' => is_object($this->bookable) && method_exists($this->bookable, 'toCardArray')
                ? $this->bookable->toCardArray($locale)
                : null,
            'experience_session' => $this->experienceSession?->toApiArray($locale),
            'review' => $this->review?->toApiArray(),
        ];
    }
}
