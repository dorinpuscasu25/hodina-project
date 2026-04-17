<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasApiTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Translatable\HasTranslations;

class AttributeOption extends Model
{
    use HasApiTranslations, HasTranslations;

    public array $translatable = ['label'];

    protected $fillable = [
        'attribute_id',
        'value',
        'label',
        'color',
        'icon',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function attribute(): BelongsTo
    {
        return $this->belongsTo(Attribute::class);
    }

    public function toApiArray(?string $locale = null): array
    {
        return [
            'id' => $this->id,
            'value' => $this->value,
            'label' => $this->translated('label', $locale),
            'color' => $this->color,
            'icon' => $this->icon,
            'sort_order' => $this->sort_order,
        ];
    }
}
