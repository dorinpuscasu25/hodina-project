<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Category;
use App\Support\MediaUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AccommodationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locale = $this->resolveLocale($request);
        $perPage = min(max((int) $request->integer('per_page', 12), 1), 50);

        $query = Accommodation::query()
            ->with(['guesthouse', 'type.parent', 'amenities', 'reviews'])
            ->published()
            ->when($request->filled('query'), function ($builder) use ($request) {
                $needle = '%'.Str::lower($request->string('query')->toString()).'%';

                $builder->where(function ($nestedQuery) use ($needle) {
                    $nestedQuery
                        ->whereRaw('LOWER(CAST(title AS TEXT)) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(CAST(short_description AS TEXT)) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(city, \'\')) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(country, \'\')) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(COALESCE(address, \'\')) LIKE ?', [$needle])
                        ->orWhereHas('guesthouse', fn ($guesthouseQuery) => $guesthouseQuery->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$needle]));
                });
            })
            ->when($request->filled('type_id'), function ($builder) use ($request) {
                $typeIds = $this->categoryFilterIds($request->integer('type_id'));
                $builder->whereIn('type_id', $typeIds);
            })
            ->when($request->filled('guesthouse_id'), fn ($builder) => $builder->where('guesthouse_id', $request->integer('guesthouse_id')))
            ->when($request->filled('city'), fn ($builder) => $builder->where('city', $request->string('city')->toString()))
            ->latest();

        $accommodations = $query->paginate($perPage);
        $collection = $accommodations->getCollection();

        if ($request->filled('starts_at') && $request->filled('ends_at')) {
            $startsAt = Carbon::parse($request->string('starts_at')->toString())->startOfDay();
            $endsAt = Carbon::parse($request->string('ends_at')->toString())->startOfDay();
            $collection = $collection->filter(
                fn (Accommodation $accommodation) => $accommodation->availableUnitsBetween($startsAt, $endsAt) > 0
            )->values();
        }

        return response()->json([
            'data' => $collection->map(fn (Accommodation $accommodation) => $accommodation->toCardArray($locale))->values(),
            'meta' => [
                'current_page' => $accommodations->currentPage(),
                'last_page' => $accommodations->lastPage(),
                'per_page' => $accommodations->perPage(),
                'total' => $accommodations->total(),
            ],
        ]);
    }

    public function show(Request $request, string $accommodation): JsonResponse
    {
        $accommodation = $this->resolvePublicAccommodation($accommodation);
        abort_unless($accommodation->status === Accommodation::STATUS_PUBLISHED, 404);

        $locale = $this->resolveLocale($request);
        $accommodation->load(['guesthouse', 'type.parent', 'amenities', 'reviews.guest']);
        $payload = $accommodation->toDetailArray($locale);

        if ($request->filled('starts_at') && $request->filled('ends_at')) {
            $payload['available_units'] = $accommodation->availableUnitsBetween(
                $request->string('starts_at')->toString(),
                $request->string('ends_at')->toString(),
            );
        }

        return response()->json([
            'data' => $payload,
        ]);
    }

    public function hostIndex(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);

        $accommodations = Accommodation::query()
            ->with(['guesthouse', 'type.parent', 'amenities', 'reviews'])
            ->where('guesthouse_id', $guesthouse->id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $accommodations->map(fn (Accommodation $accommodation) => $accommodation->toDetailArray($guesthouse->locale))->values(),
        ]);
    }

    public function hostShow(Request $request, Accommodation $accommodation): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($accommodation->guesthouse_id === $guesthouse->id, 404);

        $accommodation->load(['guesthouse', 'type.parent', 'amenities', 'reviews.guest']);

        return response()->json([
            'data' => $accommodation->toDetailArray($guesthouse->locale),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $validated = $this->validateAccommodation($request);
        $this->assertAccommodationTypeId($validated['type_id'] ?? null);
        $validated = $this->prepareMediaPayload($request, $validated);

        $accommodation = new Accommodation();
        $this->fillAccommodation($accommodation, $validated, $guesthouse->locale);
        $accommodation->guesthouse()->associate($guesthouse);
        $accommodation->currency = $accommodation->currency ?: $guesthouse->currency;
        $accommodation->slug = $this->buildUniqueSlug(Accommodation::class, $validated['title']);
        $accommodation->save();
        $this->syncAmenities($accommodation, $validated);
        if (array_key_exists('attributes', $validated)) {
            $accommodation->syncAttributeValues($validated['attributes'] ?? []);
        }

        return response()->json([
            'data' => $accommodation->fresh(['guesthouse', 'type', 'amenities', 'attributeValues.attribute'])->toDetailArray($guesthouse->locale),
        ], 201);
    }

    public function update(Request $request, Accommodation $accommodation): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($accommodation->guesthouse_id === $guesthouse->id, 404);

        $validated = $this->validateAccommodation($request, true);
        $this->assertAccommodationTypeId($validated['type_id'] ?? $accommodation->type_id);
        $validated = $this->prepareMediaPayload(
            $request,
            $validated,
            $accommodation->cover_image,
            $accommodation->gallery ?? [],
        );

        $this->fillAccommodation($accommodation, $validated, $guesthouse->locale);

        if (array_key_exists('title', $validated)) {
            $accommodation->slug = $this->buildUniqueSlug(Accommodation::class, $validated['title'], $accommodation->id);
        }

        $accommodation->save();
        $this->syncAmenities($accommodation, $validated);
        if (array_key_exists('attributes', $validated)) {
            $accommodation->syncAttributeValues($validated['attributes'] ?? []);
        }

        return response()->json([
            'data' => $accommodation->fresh(['guesthouse', 'type', 'amenities', 'attributeValues.attribute'])->toDetailArray($guesthouse->locale),
        ]);
    }

    public function destroy(Request $request, Accommodation $accommodation): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($accommodation->guesthouse_id === $guesthouse->id, 404);

        $accommodation->update(['status' => Accommodation::STATUS_ARCHIVED]);

        return response()->json([
            'message' => 'Accommodation archived successfully.',
        ]);
    }

    private function validateAccommodation(Request $request, bool $isUpdate = false): array
    {
        return $request->validate([
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'type_id' => ['nullable', 'integer', 'exists:categories,id'],
            'status' => ['nullable', Rule::in([
                Accommodation::STATUS_DRAFT,
                Accommodation::STATUS_PUBLISHED,
                Accommodation::STATUS_ARCHIVED,
            ])],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'max_guests' => ['nullable', 'integer', 'min:1'],
            'bedrooms' => ['nullable', 'integer', 'min:1'],
            'beds' => ['nullable', 'integer', 'min:1'],
            'bathrooms' => ['nullable', 'numeric', 'min:0.5'],
            'units_total' => ['nullable', 'integer', 'min:1'],
            'min_nights' => ['nullable', 'integer', 'min:1'],
            'max_nights' => ['nullable', 'integer', 'min:1'],
            'nightly_rate' => ['nullable', 'numeric', 'min:0'],
            'cleaning_fee' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'check_in_from' => ['nullable', 'date_format:H:i'],
            'check_out_until' => ['nullable', 'date_format:H:i'],
            'is_instant_book' => ['nullable', 'boolean'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'cover_image_file' => ['nullable', 'image', 'max:5120'],
            'remove_cover_image' => ['nullable', 'boolean'],
            'gallery' => ['nullable', 'array'],
            'gallery.*' => ['string', 'max:2048'],
            'gallery_files' => ['nullable', 'array'],
            'gallery_files.*' => ['image', 'max:5120'],
            'highlights' => ['nullable', 'array'],
            'highlights.*' => ['string', 'max:255'],
            'house_rules' => ['nullable', 'array'],
            'house_rules.*' => ['string', 'max:255'],
            'cancellation_policy' => ['nullable', 'string'],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:categories,id'],
            'attributes' => ['nullable', 'array'],
            'attributes.*.attribute_id' => ['required', 'integer', 'exists:attributes,id'],
            'attributes.*.value' => ['nullable'],
        ]);
    }

    private function fillAccommodation(Accommodation $accommodation, array $validated, string $locale): void
    {
        $translatableFields = ['title', 'short_description', 'description', 'highlights', 'house_rules', 'cancellation_policy'];

        $accommodation->fill(Arr::except($validated, array_merge($translatableFields, ['amenity_ids', 'attributes'])));

        foreach ($translatableFields as $field) {
            if (array_key_exists($field, $validated)) {
                $accommodation->setTranslation($field, $locale, $validated[$field]);
            }
        }

        if (! $accommodation->exists && ! array_key_exists('status', $validated)) {
            $accommodation->status = Accommodation::STATUS_DRAFT;
        }
    }

    private function syncAmenities(Accommodation $accommodation, array $validated): void
    {
        if (! array_key_exists('amenity_ids', $validated)) {
            return;
        }

        $count = Category::query()
            ->ofType(Category::TYPE_AMENITY)
            ->whereIn('id', $validated['amenity_ids'] ?? [])
            ->count();

        abort_unless($count === count($validated['amenity_ids'] ?? []), 422, 'All amenities must exist and be of type amenity.');

        $accommodation->amenities()->sync($validated['amenity_ids'] ?? []);
    }

    private function assertAccommodationTypeId(?int $typeId): void
    {
        if (! $typeId) {
            return;
        }

        $exists = Category::query()
            ->ofType(Category::TYPE_ACCOMMODATION_TYPE)
            ->whereKey($typeId)
            ->exists();

        abort_unless($exists, 422, 'Accommodation type must exist and be of the correct type.');
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
                'accommodations/covers',
                $existingCoverImage,
            );
        }

        if ($request->hasFile('gallery_files') || array_key_exists('gallery', $validated)) {
            $validated['gallery'] = collect($validated['gallery'] ?? $existingGallery)
                ->filter()
                ->values()
                ->merge(MediaUploader::storeMany(
                    $request->file('gallery_files', []),
                    'accommodations/gallery',
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

    private function resolvePublicAccommodation(string|Accommodation $accommodation): Accommodation
    {
        if ($accommodation instanceof Accommodation) {
            return $accommodation;
        }

        return Accommodation::query()
            ->where('slug', $accommodation)
            ->when(
                is_numeric($accommodation),
                fn ($query) => $query->orWhere('id', (int) $accommodation)
            )
            ->firstOrFail();
    }
}
