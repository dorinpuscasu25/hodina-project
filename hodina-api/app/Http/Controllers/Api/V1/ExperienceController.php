<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\Category;
use App\Models\Experience;
use App\Models\ExperienceSession;
use App\Services\ExperienceScheduleService;
use App\Support\MediaUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ExperienceController extends Controller
{
    public function __construct(
        private readonly ExperienceScheduleService $scheduleService
    ) {
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $locale = $this->resolveLocale($request);

        $attributes = Attribute::query()
            ->active()
            ->with(['options', 'categories:id'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'locales' => config('hodina.supported_locales'),
                'experience_categories' => $this->categoryTree(Category::TYPE_EXPERIENCE_CATEGORY, $locale),
                'accommodation_types' => $this->categoryTree(Category::TYPE_ACCOMMODATION_TYPE, $locale),
                'amenities' => Category::query()
                    ->active()
                    ->ofType(Category::TYPE_AMENITY)
                    ->orderBy('sort_order')
                    ->get()
                    ->map(fn (Category $item) => $item->toApiArray($locale))
                    ->values(),
                'attributes' => $attributes->map(function (Attribute $attribute) use ($locale) {
                    return array_merge(
                        $attribute->toApiArray($locale),
                        ['category_ids' => $attribute->categories->pluck('id')->values()->all()],
                    );
                })->values(),
                'filter_attributes' => $attributes
                    ->filter(fn (Attribute $attribute) => $attribute->is_filterable)
                    ->map(function (Attribute $attribute) use ($locale) {
                        return array_merge(
                            $attribute->toApiArray($locale),
                            ['category_ids' => $attribute->categories->pluck('id')->values()->all()],
                        );
                    })
                    ->values(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $locale = $this->resolveLocale($request);
        $perPage = min(max((int) $request->integer('per_page', 12), 1), 50);

        $experiences = Experience::query()
            ->with(['guesthouse', 'category.parent', 'categories', 'amenities', 'attributeValues.attribute', 'reviews'])
            ->published()
            ->when($request->filled('query'), function ($query) use ($request) {
                $needle = '%'.Str::lower($request->string('query')->toString()).'%';

                $query->where(function ($nestedQuery) use ($needle) {
                    $nestedQuery
                        ->whereRaw('LOWER(CAST(title AS TEXT)) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(CAST(short_description AS TEXT)) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(country, \'\')) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(address, \'\')) LIKE ?', [$needle])
                        ->orWhereHas('guesthouse', fn ($guesthouseQuery) => $guesthouseQuery->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$needle]));
                });
            })
            ->when($request->filled('category_id'), function ($query) use ($request) {
                $categoryIds = $this->categoryFilterIds($request->integer('category_id'));
                $query->where(function ($nested) use ($categoryIds) {
                    $nested->whereIn('category_id', $categoryIds)
                        ->orWhereHas('categories', fn ($q) => $q->whereIn('categories.id', $categoryIds));
                });
            })
            ->when($request->filled('guesthouse_id'), fn ($query) => $query->where('guesthouse_id', $request->integer('guesthouse_id')))
            ->when($request->filled('city'), fn ($query) => $query->where('city', $request->string('city')->toString()))
            ->when($request->filled('country'), fn ($query) => $query->where('country', $request->string('country')->toString()))
            ->when($request->filled('date_from'), fn ($query) => $query->where(function ($nested) use ($request) {
                $nested->whereNull('availability_end')
                    ->orWhere('availability_end', '>=', $request->date('date_from'));
            }))
            ->when($request->filled('date_to'), fn ($query) => $query->where(function ($nested) use ($request) {
                $nested->whereNull('availability_start')
                    ->orWhere('availability_start', '<=', $request->date('date_to'));
            }))
            ->when($request->filled('guests'), fn ($query) => $query->where(function ($nested) use ($request) {
                $nested->whereNull('max_guests')
                    ->orWhere('max_guests', '>=', $request->integer('guests'));
            }))
            ->when($request->filled('min_price'), fn ($query) => $query->where('price_amount', '>=', $request->input('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price_amount', '<=', $request->input('max_price')))
            ->when(is_array($request->input('attributes')), function ($query) use ($request) {
                foreach ((array) $request->input('attributes') as $attributeId => $value) {
                    $this->applyAttributeFilter($query, (int) $attributeId, $value);
                }
            })
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => $experiences->getCollection()->map(fn (Experience $experience) => $experience->toCardArray($locale))->values(),
            'meta' => [
                'current_page' => $experiences->currentPage(),
                'last_page' => $experiences->lastPage(),
                'per_page' => $experiences->perPage(),
                'total' => $experiences->total(),
            ],
        ]);
    }

    public function show(Request $request, string $experience): JsonResponse
    {
        $experience = $this->resolvePublicExperience($experience);
        abort_unless($experience->status === Experience::STATUS_PUBLISHED, 404);

        $locale = $this->resolveLocale($request);
        $experience->load(['guesthouse', 'category.parent', 'categories', 'amenities', 'attributeValues.attribute', 'sessions', 'reviews.guest']);

        return response()->json([
            'data' => $experience->toDetailArray($locale),
        ]);
    }

    public function sessions(Request $request, string $experience): JsonResponse
    {
        $experience = $this->resolvePublicExperience($experience);
        abort_unless($experience->status === Experience::STATUS_PUBLISHED, 404);

        $locale = $this->resolveLocale($request);
        $sessions = $experience->sessions()
            ->where('status', ExperienceSession::STATUS_SCHEDULED)
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->get()
            ->filter(fn (ExperienceSession $session) => $session->spotsLeft() > 0)
            ->values();

        return response()->json([
            'data' => $sessions->map(fn (ExperienceSession $session) => $session->toApiArray($locale)),
        ]);
    }

    public function hostIndex(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $locale = $guesthouse->locale;

        $experiences = Experience::query()
            ->with(['guesthouse', 'category.parent', 'categories', 'amenities', 'attributeValues.attribute', 'reviews'])
            ->where('guesthouse_id', $guesthouse->id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $experiences->map(fn (Experience $experience) => $experience->toDetailArray($locale))->values(),
        ]);
    }

    public function hostShow(Request $request, Experience $experience): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($experience->guesthouse_id === $guesthouse->id, 404);

        $experience->load(['guesthouse', 'category.parent', 'categories', 'amenities', 'attributeValues.attribute', 'recurrences', 'sessions', 'reviews.guest']);

        return response()->json([
            'data' => $experience->toDetailArray($guesthouse->locale),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $validated = $this->validateExperience($request);
        $validated = $this->resolvePrimaryCategory($validated);
        $this->assertExperienceCategoryId($validated['category_id'] ?? null);
        $validated = $this->prepareMediaPayload($request, $validated);

        $experience = new Experience();
        $this->fillExperience($experience, $validated, $guesthouse->locale);
        $experience->guesthouse()->associate($guesthouse);
        $experience->currency = $experience->currency ?: $guesthouse->currency;
        $experience->slug = $this->buildUniqueSlug(Experience::class, $validated['title']);
        $experience->save();

        $this->syncExperienceRelations($experience, $validated);

        return response()->json([
            'data' => $experience->fresh(['guesthouse', 'category', 'categories', 'amenities', 'attributeValues.attribute', 'recurrences', 'sessions'])
                ->toDetailArray($guesthouse->locale),
        ], 201);
    }

    public function update(Request $request, Experience $experience): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($experience->guesthouse_id === $guesthouse->id, 404);

        $validated = $this->validateExperience($request, true);
        $validated = $this->resolvePrimaryCategory($validated);
        $this->assertExperienceCategoryId($validated['category_id'] ?? $experience->category_id);
        $validated = $this->prepareMediaPayload(
            $request,
            $validated,
            $experience->cover_image,
            $experience->gallery ?? [],
        );

        $this->fillExperience($experience, $validated, $guesthouse->locale);

        if (array_key_exists('title', $validated)) {
            $experience->slug = $this->buildUniqueSlug(Experience::class, $validated['title'], $experience->id);
        }

        $experience->save();
        $this->syncExperienceRelations($experience, $validated);

        return response()->json([
            'data' => $experience->fresh(['guesthouse', 'category', 'categories', 'amenities', 'attributeValues.attribute', 'recurrences', 'sessions'])
                ->toDetailArray($guesthouse->locale),
        ]);
    }

    public function destroy(Request $request, Experience $experience): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($experience->guesthouse_id === $guesthouse->id, 404);

        $experience->update(['status' => Experience::STATUS_ARCHIVED]);

        return response()->json([
            'message' => 'Experience archived successfully.',
        ]);
    }

    public function storeSession(Request $request, Experience $experience): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($experience->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'title_override' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ]);

        $session = $this->scheduleService->createManualSession($experience, $validated);

        return response()->json([
            'data' => $session->fresh('experience')->toApiArray($guesthouse->locale),
        ], 201);
    }

    private function fillExperience(Experience $experience, array $validated, string $locale): void
    {
        $translatableFields = [
            'title',
            'short_description',
            'description',
            'meeting_point',
            'included_items',
            'excluded_items',
            'what_to_bring',
            'cancellation_policy',
            'important_notes',
        ];

        $experience->fill(Arr::except($validated, array_merge(
            $translatableFields,
            ['amenity_ids', 'category_ids', 'attributes']
        )));

        foreach ($translatableFields as $field) {
            if (array_key_exists($field, $validated)) {
                $experience->setTranslation($field, $locale, $validated[$field]);
            }
        }

        if (! $experience->exists && ! array_key_exists('status', $validated)) {
            $experience->status = Experience::STATUS_DRAFT;
        }
    }

    private function syncExperienceRelations(Experience $experience, array $validated): void
    {
        if (array_key_exists('amenity_ids', $validated)) {
            $this->assertAmenityIds($validated['amenity_ids'] ?? []);
            $experience->amenities()->sync($validated['amenity_ids'] ?? []);
        }

        if (array_key_exists('category_ids', $validated)) {
            $categoryIds = $validated['category_ids'] ?? [];
            $this->assertExperienceCategoryIds($categoryIds);
            $experience->categories()->sync($categoryIds);

            if (! empty($categoryIds)) {
                $experience->category_id = (int) $categoryIds[0];
                $experience->save();
            }
        }

        if (array_key_exists('attributes', $validated)) {
            $experience->syncAttributeValues($validated['attributes'] ?? []);
        }

        if ($this->scheduleWasProvided($validated)) {
            $experience->recurrences()->delete();

            if (! empty($validated['available_days']) && ! empty($experience->default_start_time) && ! empty($experience->default_end_time)) {
                foreach ($validated['available_days'] as $day) {
                    $experience->recurrences()->create([
                        'weekday' => $this->weekdayToIso($day),
                        'start_time' => $experience->default_start_time,
                        'end_time' => $experience->default_end_time,
                        'capacity' => $experience->max_guests,
                        'is_active' => true,
                    ]);
                }
            }

            $this->scheduleService->syncRecurringSessions($experience);
        }
    }

    private function validateExperience(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'status' => ['nullable', Rule::in([
                Experience::STATUS_DRAFT,
                Experience::STATUS_PUBLISHED,
                Experience::STATUS_ARCHIVED,
            ])],
            'location_name' => ['nullable', 'string', 'max:255'],
            'meeting_point' => ['nullable', 'string'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'duration_minutes' => ['nullable', 'integer', 'min:15'],
            'max_guests' => ['nullable', 'integer', 'min:1'],
            'min_age' => ['nullable', 'integer', 'min:0'],
            'availability_start' => ['nullable', 'date'],
            'availability_end' => ['nullable', 'date', 'after_or_equal:availability_start'],
            'price_amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'price_mode' => ['nullable', Rule::in(['per_person', 'per_group'])],
            'default_start_time' => ['nullable', 'date_format:H:i'],
            'default_end_time' => ['nullable', 'date_format:H:i'],
            'available_days' => ['nullable', 'array'],
            'available_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'is_instant_book' => ['nullable', 'boolean'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'cover_image_file' => ['nullable', 'image', 'max:5120'],
            'remove_cover_image' => ['nullable', 'boolean'],
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['string', 'max:2048'],
            'gallery_files' => ['nullable', 'array'],
            'gallery_files.*' => ['image', 'max:5120'],
            'video_url' => ['nullable', 'url'],
            'included_items' => ['nullable', 'array'],
            'included_items.*' => ['string', 'max:255'],
            'excluded_items' => ['nullable', 'array'],
            'excluded_items.*' => ['string', 'max:255'],
            'what_to_bring' => ['nullable', 'array'],
            'what_to_bring.*' => ['string', 'max:255'],
            'cancellation_policy' => ['nullable', 'string'],
            'important_notes' => ['nullable', 'string'],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:categories,id'],
            'category_ids' => ['nullable', 'array', 'max:3'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'attributes' => ['nullable', 'array'],
            'attributes.*.attribute_id' => ['required', 'integer', 'exists:attributes,id'],
            'attributes.*.value' => ['nullable'],
        ];

        return $request->validate($rules);
    }

    private function hostGuesthouse(Request $request)
    {
        $guesthouse = $request->user()->guesthouse;

        abort_unless($guesthouse, 422, 'Host account is not attached to a guesthouse.');

        return $guesthouse;
    }

    private function resolveLocale(Request $request): string
    {
        return $request->string('locale')->toString() ?: app()->getLocale();
    }

    private function categoryTree(string $type, string $locale)
    {
        return Category::query()
            ->active()
            ->ofType($type)
            ->whereNull('parent_id')
            ->with(['childrenRecursive' => fn ($query) => $query
                ->active()
                ->orderBy('sort_order')
                ->orderBy('id')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Category $item) => $item->toNestedApiArray($locale))
            ->values();
    }

    private function categoryFilterIds(?int $categoryId): array
    {
        if (! $categoryId) {
            return [];
        }

        $root = Category::query()
            ->with('childrenRecursive')
            ->findOrFail($categoryId);

        return collect([$root])
            ->merge($this->flattenCategoryTree($root))
            ->pluck('id')
            ->unique()
            ->values()
            ->all();
    }

    private function flattenCategoryTree(Category $category)
    {
        return $category->childrenRecursive->flatMap(function (Category $child) {
            return collect([$child])->merge($this->flattenCategoryTree($child));
        });
    }

    private function buildUniqueSlug(string $modelClass, string $source, ?int $ignoreId = null): string
    {
        $base = Str::slug($source);
        $slug = $base ?: Str::lower(Str::random(8));
        $counter = 1;

        while ($modelClass::query()
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function resolvePublicExperience(string|Experience $experience): Experience
    {
        if ($experience instanceof Experience) {
            return $experience;
        }

        return Experience::query()
            ->where('slug', $experience)
            ->when(
                is_numeric($experience),
                fn ($query) => $query->orWhere('id', (int) $experience)
            )
            ->firstOrFail();
    }

    private function weekdayToIso(string $day): int
    {
        return [
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
            'sunday' => 7,
        ][$day];
    }

    private function assertAmenityIds(array $amenityIds): void
    {
        if ($amenityIds === []) {
            return;
        }

        $count = Category::query()
            ->ofType(Category::TYPE_AMENITY)
            ->whereIn('id', $amenityIds)
            ->count();

        abort_unless($count === count($amenityIds), 422, 'All amenities must exist and be of type amenity.');
    }

    private function assertExperienceCategoryId(?int $categoryId): void
    {
        if (! $categoryId) {
            return;
        }

        $exists = Category::query()
            ->ofType(Category::TYPE_EXPERIENCE_CATEGORY)
            ->whereKey($categoryId)
            ->exists();

        abort_unless($exists, 422, 'Category must exist and be of type experience category.');
    }

    private function applyAttributeFilter($query, int $attributeId, mixed $value): void
    {
        if ($value === null || $value === '' || $value === [] || $attributeId <= 0) {
            return;
        }

        $attribute = Attribute::query()->find($attributeId);
        if (! $attribute) {
            return;
        }

        $query->whereHas('attributeValues', function ($q) use ($attribute, $value) {
            $q->where('attribute_id', $attribute->id);

            switch ($attribute->input_type) {
                case Attribute::TYPE_BOOLEAN:
                    $q->where('value_boolean', filter_var($value, FILTER_VALIDATE_BOOLEAN));
                    break;
                case Attribute::TYPE_NUMBER:
                    $q->where('value_number', (float) $value);
                    break;
                case Attribute::TYPE_RANGE:
                    if (is_array($value)) {
                        if (isset($value['min'])) {
                            $q->where('value_number', '>=', (float) $value['min']);
                        }
                        if (isset($value['max'])) {
                            $q->where('value_number', '<=', (float) $value['max']);
                        }
                    }
                    break;
                case Attribute::TYPE_MULTISELECT:
                    $values = is_array($value) ? $value : [$value];
                    $q->where(function ($inner) use ($values) {
                        foreach ($values as $v) {
                            $inner->orWhereJsonContains('value_json', (string) $v);
                        }
                    });
                    break;
                case Attribute::TYPE_SELECT:
                case Attribute::TYPE_RADIO:
                    $values = is_array($value) ? $value : [$value];
                    $q->whereIn('value_string', array_map('strval', $values));
                    break;
                case Attribute::TYPE_DATE:
                    $q->where('value_string', (string) $value);
                    break;
                default:
                    $q->where('value_string', (string) $value);
            }
        });
    }

    private function resolvePrimaryCategory(array $validated): array
    {
        if (empty($validated['category_id']) && ! empty($validated['category_ids'])) {
            $validated['category_id'] = (int) $validated['category_ids'][0];
        }

        return $validated;
    }

    private function assertExperienceCategoryIds(array $categoryIds): void
    {
        if ($categoryIds === []) {
            return;
        }

        $count = Category::query()
            ->ofType(Category::TYPE_EXPERIENCE_CATEGORY)
            ->whereIn('id', $categoryIds)
            ->count();

        abort_unless($count === count($categoryIds), 422, 'All categories must exist and be of type experience category.');
    }

    private function prepareMediaPayload(
        Request $request,
        array $validated,
        ?string $existingCoverImage = null,
        array $existingGallery = [],
    ): array {
        if ($request->boolean('remove_cover_image')) {
            MediaUploader::delete($existingCoverImage);
            $validated['cover_image'] = null;
        } elseif ($request->hasFile('cover_image_file')) {
            $validated['cover_image'] = MediaUploader::store(
                $request->file('cover_image_file'),
                'experiences/covers',
                $existingCoverImage,
            );
        }

        if ($request->hasFile('gallery_files') || array_key_exists('gallery', $validated)) {
            $validated['gallery'] = collect($validated['gallery'] ?? $existingGallery)
                ->filter()
                ->values()
                ->merge(MediaUploader::storeMany(
                    $request->file('gallery_files', []),
                    'experiences/gallery',
                ))
                ->values()
                ->all();
        }

        unset(
            $validated['cover_image_file'],
            $validated['remove_cover_image'],
            $validated['gallery_files'],
        );

        return $validated;
    }

    private function scheduleWasProvided(array $validated): bool
    {
        return array_key_exists('available_days', $validated)
            || array_key_exists('default_start_time', $validated)
            || array_key_exists('default_end_time', $validated)
            || array_key_exists('max_guests', $validated);
    }
}
