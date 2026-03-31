<?php

namespace App\Models\Concerns;

trait HasApiTranslations
{
    public function translated(string $field, ?string $locale = null): mixed
    {
        $locale ??= app()->getLocale();

        if (method_exists($this, 'getTranslation')) {
            return $this->getTranslation($field, $locale, true);
        }

        return $this->{$field};
    }
}
