<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\InteractsWithAdminTables;
use App\Http\Controllers\Admin\Concerns\InteractsWithTranslatedFields;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Support\MediaUploader;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    use InteractsWithAdminTables, InteractsWithTranslatedFields;

    public function index(Request $request): Response
    {
        $search = $this->searchTerm($request);
        $perPage = $this->perPage($request);
        $type = (string) $request->input('type', '');
        $allowedTypes = [
            Category::TYPE_EXPERIENCE_CATEGORY,
            Category::TYPE_ACCOMMODATION_TYPE,
            Category::TYPE_AMENITY,
        ];
        $like = $this->like($search);

        if (! in_array($type, $allowedTypes, true)) {
            $type = '';
        }

        $categories = Category::query()
            ->when($type, fn ($query) => $query->where('type', $type))
            ->when($search, function ($query) use ($like) {
                $query->where(function ($nestedQuery) use ($like) {
                    $nestedQuery
                        ->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(CAST(slug AS TEXT)) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(code, \'\')) LIKE ?', [$like]);
                });
            })
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Category $category) => $this->categoryTableRow($category));

        return Inertia::render('admin/categories/index', [
            'categories' => $categories,
            'filters' => [
                'search' => $search,
                'type' => $type,
                'per_page' => $perPage,
            ],
            'typeOptions' => $this->typeOptions(),
            'perPageOptions' => $this->perPageOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/categories/form', [
            'mode' => 'create',
            'category' => $this->categoryFormData(),
            'typeOptions' => $this->typeOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function edit(Category $category): Response
    {
        return Inertia::render('admin/categories/form', [
            'mode' => 'edit',
            'category' => $this->categoryFormData($category),
            'typeOptions' => $this->typeOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->persist($request, new Category());
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        return $this->persist($request, $category);
    }

    private function persist(Request $request, Category $category): RedirectResponse
    {
        $rules = [
            'type' => ['required', Rule::in([
                Category::TYPE_EXPERIENCE_CATEGORY,
                Category::TYPE_ACCOMMODATION_TYPE,
                Category::TYPE_AMENITY,
            ])],
            'code' => ['nullable', 'string', 'max:100'],
            'image_file' => ['nullable', 'image', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
            'card_background' => ['nullable', 'string', 'max:40'],
            'accent_color' => ['nullable', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'name' => ['required', 'array'],
            'description' => ['nullable', 'array'],
        ];

        foreach ($this->supportedLocales() as $locale) {
            $rules["name.{$locale}"] = ['required', 'string', 'max:255'];
            $rules["description.{$locale}"] = ['nullable', 'string'];
        }

        $validated = $request->validate($rules);

        if ($request->boolean('remove_image')) {
            MediaUploader::delete($category->image);
            $category->image = null;
        } elseif ($request->hasFile('image_file')) {
            $category->image = MediaUploader::store(
                $request->file('image_file'),
                'categories/icons',
                $category->image,
            );
        }

        $category->fill([
            'type' => $validated['type'],
            'code' => $validated['code'] ?? null,
            'parent_id' => null,
            'name' => $this->normalizeTranslations($validated['name']),
            'description' => $this->normalizeTranslations($validated['description'] ?? []),
            'is_active' => $validated['is_active'],
            'sort_order' => $validated['sort_order'] ?? 0,
            'settings' => array_filter([
                'card_background' => $validated['card_background'] ?? null,
                'accent_color' => $validated['accent_color'] ?? null,
            ]),
        ]);

        $category->save();

        return to_route('admin.categories.index');
    }

    private function categoryTableRow(Category $category): array
    {
        return [
            'id' => $category->id,
            'type' => $category->type,
            'code' => $category->code,
            'image' => MediaUploader::url($category->image),
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'name' => $category->translated('name', 'ro') ?: $category->translated('name', 'en'),
            'slug' => $category->translated('slug', 'ro') ?: $category->translated('slug', 'en'),
            'card_background' => data_get($category->settings, 'card_background'),
            'accent_color' => data_get($category->settings, 'accent_color'),
            'updated_at' => $category->updated_at?->toIso8601String(),
            'created_at' => $category->created_at?->toIso8601String(),
        ];
    }

    private function categoryFormData(?Category $category = null): array
    {
        if ($category) {
            return [
                'id' => $category->id,
                'type' => $category->type,
                'code' => $category->code ?? '',
                'name' => $this->translationsFor($category, 'name'),
                'description' => $this->translationsFor($category, 'description'),
                'image_url' => MediaUploader::url($category->image),
                'sort_order' => $category->sort_order,
                'is_active' => $category->is_active,
                'card_background' => data_get($category->settings, 'card_background', '#eefbf2'),
                'accent_color' => data_get($category->settings, 'accent_color', '#0f8f47'),
            ];
        }

        return [
            'id' => null,
            'type' => Category::TYPE_EXPERIENCE_CATEGORY,
            'code' => '',
            'name' => $this->emptyTranslations(),
            'description' => $this->emptyTranslations(),
            'image_url' => null,
            'sort_order' => 0,
            'is_active' => true,
            'card_background' => '#eefbf2',
            'accent_color' => '#0f8f47',
        ];
    }

    private function typeOptions(): array
    {
        return [
            ['value' => Category::TYPE_EXPERIENCE_CATEGORY, 'label' => 'Experience category'],
            ['value' => Category::TYPE_ACCOMMODATION_TYPE, 'label' => 'Accommodation type'],
            ['value' => Category::TYPE_AMENITY, 'label' => 'Amenity'],
        ];
    }
}
