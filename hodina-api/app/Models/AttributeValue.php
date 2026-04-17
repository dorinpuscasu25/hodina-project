<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AttributeValue extends Model
{
    protected $fillable = [
        'attribute_id',
        'attributable_type',
        'attributable_id',
        'value_string',
        'value_number',
        'value_boolean',
        'value_json',
    ];

    protected function casts(): array
    {
        return [
            'value_number' => 'decimal:4',
            'value_boolean' => 'boolean',
            'value_json' => 'array',
        ];
    }

    public function attribute(): BelongsTo
    {
        return $this->belongsTo(Attribute::class);
    }

    public function attributable(): MorphTo
    {
        return $this->morphTo();
    }

    public function typedValue(): mixed
    {
        if ($this->value_json !== null) {
            return $this->value_json;
        }
        if ($this->value_number !== null) {
            return (float) $this->value_number;
        }
        if ($this->value_boolean !== null) {
            return (bool) $this->value_boolean;
        }
        return $this->value_string;
    }
}
