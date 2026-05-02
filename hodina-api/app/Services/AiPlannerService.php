<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Experience;
use App\Support\MediaUploader;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiPlannerService
{
    private const MAX_HISTORY = 10;
    private const MAX_PROMPT_LENGTH = 2000;
    private const CATALOG_EXPERIENCES = 40;
    private const CATALOG_ACCOMMODATIONS = 25;

    public function plan(string $prompt, array $history = [], string $locale = 'ro'): array
    {
        $prompt = mb_substr(trim($prompt), 0, self::MAX_PROMPT_LENGTH);
        $locale = in_array($locale, ['ro', 'ru', 'en'], true) ? $locale : 'ro';

        $catalog = $this->buildCatalog($locale);

        $apiKey = config('services.openai.api_key');
        if (is_string($apiKey) && $apiKey !== '') {
            try {
                return $this->planWithOpenAi($prompt, $history, $catalog, $apiKey, $locale);
            } catch (Throwable $e) {
                Log::warning('AiPlannerService: OpenAI call failed, falling back', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->planWithFallback($prompt, $catalog, $locale);
    }

    private function buildCatalog(string $locale): array
    {
        $experiences = Experience::query()
            ->with(['category'])
            ->published()
            ->limit(self::CATALOG_EXPERIENCES)
            ->get()
            ->map(function (Experience $exp) use ($locale): array {
                return [
                    'kind' => 'experience',
                    'id' => $exp->id,
                    'slug' => $exp->slug,
                    'title' => (string) ($exp->translated('title', $locale) ?? ''),
                    'short_description' => (string) ($exp->translated('short_description', $locale) ?? ''),
                    'city' => $exp->city,
                    'category' => $exp->category?->translated('name', $locale),
                    'price_amount' => (float) $exp->price_amount,
                    'currency' => $exp->currency,
                    'duration_minutes' => (int) ($exp->duration_minutes ?? 0),
                    'cover_image' => MediaUploader::url($exp->cover_image),
                ];
            })
            ->all();

        $accommodations = Accommodation::query()
            ->published()
            ->limit(self::CATALOG_ACCOMMODATIONS)
            ->get()
            ->map(function (Accommodation $acc) use ($locale): array {
                return [
                    'kind' => 'accommodation',
                    'id' => $acc->id,
                    'slug' => $acc->slug,
                    'title' => (string) ($acc->translated('title', $locale) ?? ''),
                    'short_description' => (string) ($acc->translated('short_description', $locale) ?? ''),
                    'city' => $acc->city,
                    'category' => null,
                    'price_amount' => (float) $acc->nightly_rate,
                    'currency' => $acc->currency,
                    'duration_minutes' => 0,
                    'cover_image' => MediaUploader::url($acc->cover_image),
                ];
            })
            ->all();

        return ['experiences' => $experiences, 'accommodations' => $accommodations];
    }

    private function planWithOpenAi(
        string $prompt,
        array $history,
        array $catalog,
        string $apiKey,
        string $locale
    ): array {
        $catalogText = $this->formatCatalogForPrompt($catalog);
        $languageName = match ($locale) {
            'ru' => 'Russian',
            'en' => 'English',
            default => 'Romanian',
        };

        $systemPrompt = <<<TEXT
You are Hodina's friendly travel concierge for Moldova. Always reply in {$languageName}.
Be warm, concise, and concrete. You may ONLY recommend items that appear in the CATALOG below — never invent listings.
Refer to chosen items by their exact `slug`. If nothing fits, return zero picks and ask one clarifying question.

CATALOG:
{$catalogText}

You MUST respond with strictly valid JSON in this exact shape:
{
  "reply": "<warm explanation in {$languageName}, 1-3 short paragraphs, no markdown bullets>",
  "picks": [{"kind": "experience" or "accommodation", "slug": "<slug from catalog>"}]
}
Pick 1-5 items max, ordered by best fit.
TEXT;

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        $trimmedHistory = array_slice($history, -self::MAX_HISTORY);
        foreach ($trimmedHistory as $msg) {
            if (! is_array($msg) || ! isset($msg['role'], $msg['content'])) {
                continue;
            }
            if (! in_array($msg['role'], ['user', 'assistant'], true)) {
                continue;
            }
            $messages[] = [
                'role' => $msg['role'],
                'content' => mb_substr((string) $msg['content'], 0, self::MAX_PROMPT_LENGTH),
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $prompt];

        $payload = [
            'model' => config('services.openai.model', 'gpt-4o-mini'),
            'messages' => $messages,
            'temperature' => 0.5,
            'response_format' => ['type' => 'json_object'],
        ];

        $response = Http::withToken($apiKey)
            ->timeout(30)
            ->acceptJson()
            ->post('https://api.openai.com/v1/chat/completions', $payload)
            ->throw()
            ->json();

        $content = $response['choices'][0]['message']['content'] ?? '{}';
        $parsed = is_string($content) ? json_decode($content, true) : null;

        if (! is_array($parsed)) {
            $parsed = [];
        }

        $reply = trim((string) ($parsed['reply'] ?? ''));
        $picks = is_array($parsed['picks'] ?? null) ? $parsed['picks'] : [];

        if ($reply === '') {
            $reply = $this->defaultReply($locale);
        }

        return [
            'reply' => $reply,
            'suggestions' => $this->resolveSuggestions($picks, $catalog),
        ];
    }

    private function planWithFallback(string $prompt, array $catalog, string $locale): array
    {
        $tokens = preg_split('/\s+/u', mb_strtolower($prompt), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $score = function (array $item) use ($tokens): int {
            $haystack = mb_strtolower(implode(' ', array_filter([
                $item['title'] ?? '',
                $item['short_description'] ?? '',
                $item['city'] ?? '',
                $item['category'] ?? '',
            ])));
            $s = 0;
            foreach ($tokens as $tok) {
                if (mb_strlen($tok) < 3) {
                    continue;
                }
                if (mb_strpos($haystack, $tok) !== false) {
                    $s += 1;
                }
            }

            return $s;
        };

        $merged = array_merge($catalog['experiences'], $catalog['accommodations']);
        usort($merged, fn (array $a, array $b): int => $score($b) <=> $score($a));

        $matched = array_values(array_filter($merged, fn (array $i): bool => $score($i) > 0));
        $picks = array_slice($matched, 0, 5);

        if (empty($picks)) {
            $picks = array_slice($catalog['experiences'], 0, 3);
        }

        $reply = match ($locale) {
            'ru' => 'Вот несколько вариантов с Hodina, которые могут подойти. Расскажите больше о датах, стиле или бюджете — и я уточню подборку.',
            'en' => 'Here are a few picks from Hodina that could match. Tell me more about your dates, vibe or budget and I will refine.',
            default => 'Iată câteva propuneri din Hodina care s-ar putea potrivi. Spune-mi mai multe despre date, stil sau buget și ajustez selecția.',
        };

        return [
            'reply' => $reply,
            'suggestions' => $this->resolveSuggestions(
                array_map(
                    fn (array $p): array => ['kind' => $p['kind'], 'slug' => $p['slug']],
                    $picks
                ),
                $catalog
            ),
        ];
    }

    private function resolveSuggestions(array $picks, array $catalog): array
    {
        $byKey = [];
        foreach (array_merge($catalog['experiences'], $catalog['accommodations']) as $item) {
            $byKey[$item['kind'].':'.$item['slug']] = $item;
        }

        $resolved = [];
        $seen = [];
        foreach ($picks as $pick) {
            if (! is_array($pick)) {
                continue;
            }
            $kind = $pick['kind'] ?? null;
            $slug = $pick['slug'] ?? null;
            if (! is_string($kind) || ! is_string($slug)) {
                continue;
            }
            $key = $kind.':'.$slug;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            if (isset($byKey[$key])) {
                $resolved[] = $byKey[$key];
            }
        }

        return $resolved;
    }

    private function formatCatalogForPrompt(array $catalog): string
    {
        $lines = ['EXPERIENCES:'];
        foreach ($catalog['experiences'] as $e) {
            $lines[] = sprintf(
                '- slug=%s | %s | city=%s | %s | %s %s | %d min',
                $e['slug'],
                $e['title'] !== '' ? $e['title'] : '(untitled)',
                $e['city'] ?? '-',
                $e['short_description'] !== '' ? $e['short_description'] : ($e['category'] ?? '-'),
                rtrim(rtrim(number_format((float) $e['price_amount'], 2, '.', ''), '0'), '.'),
                (string) $e['currency'],
                (int) $e['duration_minutes']
            );
        }

        $lines[] = '';
        $lines[] = 'ACCOMMODATIONS:';
        foreach ($catalog['accommodations'] as $a) {
            $lines[] = sprintf(
                '- slug=%s | %s | city=%s | %s | from %s %s/night',
                $a['slug'],
                $a['title'] !== '' ? $a['title'] : '(untitled)',
                $a['city'] ?? '-',
                $a['short_description'] !== '' ? $a['short_description'] : '-',
                rtrim(rtrim(number_format((float) $a['price_amount'], 2, '.', ''), '0'), '.'),
                (string) $a['currency']
            );
        }

        return implode("\n", $lines);
    }

    private function defaultReply(string $locale): string
    {
        return match ($locale) {
            'ru' => 'Я подобрал несколько вариантов на Hodina. Уточните даты или предпочтения, чтобы сделать подборку точнее.',
            'en' => 'I pulled a few Hodina picks for you. Share more about dates or preferences so I can refine.',
            default => 'Ți-am pregătit câteva propuneri din Hodina. Spune-mi mai multe despre date sau preferințe ca să rafinez selecția.',
        };
    }
}
