<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\InteractsWithAdminTables;
use App\Http\Controllers\Admin\Concerns\InteractsWithTranslatedFields;
use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Experience;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GuesthouseController extends Controller
{
    use InteractsWithAdminTables, InteractsWithTranslatedFields;

    public function index(Request $request): Response
    {
        $search = $this->searchTerm($request);
        $perPage = $this->perPage($request);
        $like = $this->like($search);

        $guesthouses = Guesthouse::query()
            ->withCount([
                'users as hosts_count' => fn ($query) => $query->where('role', User::ROLE_HOST),
                'experiences',
                'accommodations',
                'bookings',
            ])
            ->when($search, function ($query) use ($like) {
                $query->where(function ($nestedQuery) use ($like) {
                    $nestedQuery
                        ->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(slug) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(public_email, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(public_phone, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$like]);
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Guesthouse $guesthouse) => $this->guesthouseTableRow($guesthouse));

        return Inertia::render('admin/guesthouses/index', [
            'guesthouses' => $guesthouses,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'perPageOptions' => $this->perPageOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/guesthouses/form', [
            'mode' => 'create',
            'guesthouse' => $this->guesthouseFormData(),
            'locales' => $this->supportedLocaleOptions(),
            'currencyOptions' => $this->currencyOptions(),
            'listings' => [
                'experiences' => [],
                'accommodations' => [],
            ],
        ]);
    }

    public function edit(Guesthouse $guesthouse): Response
    {
        $guesthouse->load([
            'experiences.category',
            'accommodations.type',
        ]);

        return Inertia::render('admin/guesthouses/form', [
            'mode' => 'edit',
            'guesthouse' => $this->guesthouseFormData($guesthouse),
            'locales' => $this->supportedLocaleOptions(),
            'currencyOptions' => $this->currencyOptions(),
            'listings' => [
                'experiences' => $guesthouse->experiences
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn (Experience $experience) => $this->experienceRow($experience, $guesthouse->locale))
                    ->all(),
                'accommodations' => $guesthouse->accommodations
                    ->sortByDesc('created_at')
                    ->values()
                    ->map(fn (Accommodation $accommodation) => $this->accommodationRow($accommodation, $guesthouse->locale))
                    ->all(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $guesthouse = new Guesthouse();

        return $this->persist($request, $guesthouse);
    }

    public function update(Request $request, Guesthouse $guesthouse): RedirectResponse
    {
        return $this->persist($request, $guesthouse);
    }

    public function updateExperienceStatus(Request $request, Guesthouse $guesthouse, Experience $experience): RedirectResponse
    {
        abort_unless($experience->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                Experience::STATUS_DRAFT,
                Experience::STATUS_PUBLISHED,
                Experience::STATUS_ARCHIVED,
            ])],
        ]);

        $experience->update([
            'status' => $validated['status'],
        ]);

        return back();
    }

    public function updateAccommodationStatus(Request $request, Guesthouse $guesthouse, Accommodation $accommodation): RedirectResponse
    {
        abort_unless($accommodation->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                Accommodation::STATUS_DRAFT,
                Accommodation::STATUS_PUBLISHED,
                Accommodation::STATUS_ARCHIVED,
            ])],
        ]);

        $accommodation->update([
            'status' => $validated['status'],
        ]);

        return back();
    }

    private function persist(Request $request, Guesthouse $guesthouse): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'array'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'name.ro' => ['required', 'string', 'max:255'],
            'name.ru' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'array'],
            'description.*' => ['nullable', 'string'],
            'check_in_notes' => ['nullable', 'array'],
            'check_in_notes.*' => ['nullable', 'string'],
            'house_rules' => ['nullable', 'array'],
            'house_rules.*' => ['nullable', 'string'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9-]+$/',
                Rule::unique('guesthouses', 'slug')->ignore($guesthouse),
            ],
            'public_email' => ['nullable', 'email', 'max:255'],
            'public_phone' => ['nullable', 'string', 'max:50'],
            'locale' => ['required', Rule::in($this->supportedLocales())],
            'currency' => ['required', 'string', 'size:3'],
            'country' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['required', 'boolean'],
        ]);

        $name = $this->normalizeTranslations($validated['name'], true);

        $guesthouse->fill([
            'name' => $name,
            'description' => $this->normalizeTranslations($validated['description'] ?? []),
            'check_in_notes' => $this->normalizeTranslations($validated['check_in_notes'] ?? []),
            'house_rules' => $this->normalizeTranslations($validated['house_rules'] ?? []),
            'slug' => $this->resolveSlug($validated['slug'] ?? null, $name, $guesthouse),
            'public_email' => $validated['public_email'] ?? null,
            'public_phone' => $validated['public_phone'] ?? null,
            'locale' => $validated['locale'],
            'currency' => Str::upper($validated['currency']),
            'country' => $validated['country'],
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'cover_image' => $validated['cover_image'] ?? null,
            'is_active' => $validated['is_active'],
        ]);

        $guesthouse->save();

        return to_route('admin.guesthouses.index');
    }

    private function resolveSlug(?string $providedSlug, array $name, Guesthouse $guesthouse): string
    {
        $base = Str::slug($providedSlug ?: ($name['ro'] ?: $name['en'] ?: $name['ru'] ?: 'pensiune'));

        if (blank($base)) {
            $base = 'pensiune';
        }

        $slug = $base;
        $counter = 2;

        while (
            Guesthouse::query()
                ->where('slug', $slug)
                ->when($guesthouse->exists, fn ($query) => $query->whereKeyNot($guesthouse->getKey()))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function guesthouseTableRow(Guesthouse $guesthouse): array
    {
        return [
            'id' => $guesthouse->id,
            'name' => $guesthouse->translated('name', 'ro') ?: $guesthouse->translated('name', 'en') ?: $guesthouse->slug,
            'slug' => $guesthouse->slug,
            'public_email' => $guesthouse->public_email,
            'public_phone' => $guesthouse->public_phone,
            'locale' => $guesthouse->locale,
            'currency' => $guesthouse->currency,
            'city' => $guesthouse->city,
            'country' => $guesthouse->country,
            'is_active' => $guesthouse->is_active,
            'hosts_count' => (int) $guesthouse->hosts_count,
            'experiences_count' => (int) $guesthouse->experiences_count,
            'accommodations_count' => (int) $guesthouse->accommodations_count,
            'bookings_count' => (int) $guesthouse->bookings_count,
            'created_at' => $guesthouse->created_at?->toIso8601String(),
            'updated_at' => $guesthouse->updated_at?->toIso8601String(),
        ];
    }

    private function guesthouseFormData(?Guesthouse $guesthouse = null): array
    {
        if ($guesthouse) {
            return [
                'id' => $guesthouse->id,
                'name' => $this->translationsFor($guesthouse, 'name', true),
                'description' => $this->translationsFor($guesthouse, 'description'),
                'check_in_notes' => $this->translationsFor($guesthouse, 'check_in_notes'),
                'house_rules' => $this->translationsFor($guesthouse, 'house_rules'),
                'slug' => $guesthouse->slug,
                'public_email' => $guesthouse->public_email ?? '',
                'public_phone' => $guesthouse->public_phone ?? '',
                'locale' => $guesthouse->locale,
                'currency' => $guesthouse->currency,
                'country' => $guesthouse->country,
                'city' => $guesthouse->city ?? '',
                'address' => $guesthouse->address ?? '',
                'latitude' => $guesthouse->latitude ? (string) $guesthouse->latitude : '',
                'longitude' => $guesthouse->longitude ? (string) $guesthouse->longitude : '',
                'cover_image' => $guesthouse->cover_image ?? '',
                'is_active' => $guesthouse->is_active,
            ];
        }

        return [
            'id' => null,
            'name' => $this->emptyTranslations(),
            'description' => $this->emptyTranslations(),
            'check_in_notes' => $this->emptyTranslations(),
            'house_rules' => $this->emptyTranslations(),
            'slug' => '',
            'public_email' => '',
            'public_phone' => '',
            'locale' => 'ro',
            'currency' => 'MDL',
            'country' => 'Moldova',
            'city' => '',
            'address' => '',
            'latitude' => '',
            'longitude' => '',
            'cover_image' => '',
            'is_active' => true,
        ];
    }

    private function experienceRow(Experience $experience, string $locale): array
    {
        return [
            'id' => $experience->id,
            'title' => $experience->translated('title', $locale)
                ?: $experience->translated('title', 'ro')
                ?: $experience->translated('title', 'en')
                ?: $experience->slug,
            'slug' => $experience->slug,
            'status' => $experience->status,
            'category_label' => $experience->category?->toApiArray($locale)['name'] ?? null,
            'location' => collect([$experience->city, $experience->country])->filter()->implode(', '),
            'price_label' => number_format((float) $experience->price_amount, 2).' '.$experience->currency.' / '.
                ($experience->price_mode === 'per_group' ? 'grup' : 'persoana'),
            'updated_at' => $experience->updated_at?->toIso8601String(),
        ];
    }

    private function accommodationRow(Accommodation $accommodation, string $locale): array
    {
        return [
            'id' => $accommodation->id,
            'title' => $accommodation->translated('title', $locale)
                ?: $accommodation->translated('title', 'ro')
                ?: $accommodation->translated('title', 'en')
                ?: $accommodation->slug,
            'slug' => $accommodation->slug,
            'status' => $accommodation->status,
            'category_label' => $accommodation->type?->toApiArray($locale)['name'] ?? null,
            'location' => collect([$accommodation->city, $accommodation->country])->filter()->implode(', '),
            'price_label' => number_format((float) $accommodation->nightly_rate, 2).' '.$accommodation->currency.' / noapte',
            'updated_at' => $accommodation->updated_at?->toIso8601String(),
        ];
    }

    private function currencyOptions(): array
    {
        return [
            ['code' => 'MDL', 'label' => 'MDL'],
            ['code' => 'EUR', 'label' => 'EUR'],
            ['code' => 'USD', 'label' => 'USD'],
        ];
    }
}
