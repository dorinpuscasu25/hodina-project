<?php

namespace App\Http\Controllers\Admin\Concerns;

trait InteractsWithTranslatedFields
{
    protected function supportedLocales(): array
    {
        return array_keys(config('hodina.supported_locales', [
            'en' => 'English',
            'ro' => 'Romanian',
            'ru' => 'Russian',
        ]));
    }

    protected function supportedLocaleOptions(): array
    {
        return collect(config('hodina.supported_locales', []))
            ->map(fn (string $label, string $code) => [
                'code' => $code,
                'label' => $label,
            ])
            ->values()
            ->all();
    }

    protected function emptyTranslations(): array
    {
        return array_fill_keys($this->supportedLocales(), '');
    }

    protected function translationsFor(object|null $model, string $field, bool $fillMissing = false): array
    {
        $translations = $this->emptyTranslations();

        if ($model && method_exists($model, 'getTranslation')) {
            foreach ($translations as $locale => $value) {
                $translations[$locale] = trim((string) ($model->getTranslation($field, $locale, false) ?? ''));
            }
        }

        return $fillMissing ? $this->fillMissingTranslations($translations) : $translations;
    }

    protected function normalizeTranslations(?array $translations, bool $fillMissing = false): array
    {
        $normalized = $this->emptyTranslations();

        foreach ($normalized as $locale => $value) {
            $normalized[$locale] = trim((string) data_get($translations, $locale, ''));
        }

        return $fillMissing ? $this->fillMissingTranslations($normalized) : $normalized;
    }

    protected function fillMissingTranslations(array $translations): array
    {
        $fallback = collect($translations)->first(fn (string $value) => filled($value)) ?? '';

        return collect($translations)
            ->map(fn (string $value) => filled($value) ? $value : $fallback)
            ->all();
    }
}
