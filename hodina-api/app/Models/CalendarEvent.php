<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CalendarEvent extends Model
{
    public const KIND_CUSTOM = 'custom';
    public const KIND_MAINTENANCE = 'maintenance';

    protected $fillable = [
        'guesthouse_id',
        'bookable_type',
        'bookable_id',
        'kind',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'blocks_inventory',
        'units_blocked',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'blocks_inventory' => 'boolean',
        ];
    }

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function bookable(): MorphTo
    {
        return $this->morphTo();
    }
}
