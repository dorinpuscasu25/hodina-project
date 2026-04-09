<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Review extends Model
{
    protected $fillable = [
        'booking_id',
        'guesthouse_id',
        'guest_user_id',
        'reviewable_type',
        'reviewable_id',
        'rating',
        'title',
        'comment',
        'host_reply',
        'host_replied_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'host_replied_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guest_user_id');
    }

    public function reviewable(): MorphTo
    {
        return $this->morphTo();
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'title' => $this->title,
            'comment' => $this->comment,
            'host_reply' => $this->host_reply,
            'host_replied_at' => $this->host_replied_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'guest' => $this->guest ? [
                'id' => $this->guest->id,
                'name' => $this->guest->name,
            ] : null,
        ];
    }
}
