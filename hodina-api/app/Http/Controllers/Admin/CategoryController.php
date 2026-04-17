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
            ->with('parent')
            ->when($type, fn ($query) => $query->where('type', $type))
            ->when($search, function ($query) use ($like) {
                $query->where(function ($nestedQuery) use ($like) {
                    $nestedQuery
                        ->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(CAST(slug AS TEXT)) LIKE ?', [$like]);
                });
            })
            ->orderBy('type')
            ->orderByRaw('COALESCE(parent_id, id) asc')
            ->orderBy('parent_id')
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
            'parentOptions' => $this->parentOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function edit(Category $category): Response
    {
        return Inertia::render('admin/categories/form', [
            'mode' => 'edit',
            'category' => $this->categoryFormData($category),
            'typeOptions' => $this->typeOptions(),
            'parentOptions' => $this->parentOptions($category),
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
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
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
            $rules["name.{$locale}"] = ['nullable', 'string', 'max:255'];
            $rules["description.{$locale}"] = ['nullable', 'string'];
        }

        $validated = $request->validate($rules);

        $hasAtLeastOneName = collect($validated['name'] ?? [])
            ->contains(fn ($value) => filled(trim((string) $value)));

        if (! $hasAtLeastOneName) {
            return back()
                ->withErrors(['name' => 'Introdu numele cel puțin într-o limbă.'])
                ->withInput();
        }

        $parentId = $validated['parent_id'] ?? null;

        if ($parentId) {
            abort_if($category->exists && (int) $category->id === (int) $parentId, 422, 'Categoria nu poate fi părinte pentru ea însăși.');

            $parent = Category::query()->findOrFail($parentId);
            abort_unless($parent->type === $validated['type'], 422, 'Subcategoria trebuie să aibă același tip ca părintele.');
            abort_if($this->createsCycle($category, $parent), 422, 'Nu poți muta categoria sub propria ei subcategorie.');
        }

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
            'parent_id' => $parentId,
            'name' => $this->normalizeTranslations($validated['name'], true),
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
            'parent_id' => $category->parent_id,
            'parent_name' => $category->parent?->translated('name', 'ro') ?: $category->parent?->translated('name', 'en'),
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
                'parent_id' => $category->parent_id,
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
            'parent_id' => null,
            'name' => $this->emptyTranslations(),
            'description' => $this->emptyTranslations(),
            'image_url' => null,
            'sort_order' => 0,
            'is_active' => true,
            'card_background' => '#eefbf2',
            'accent_color' => '#0f8f47',
        ];
    }

    private function parentOptions(?Category $category = null): array
    {
        return Category::query()
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->reject(fn (Category $item) => $category && (int) $item->id === (int) $category->id)
            ->map(fn (Category $item) => [
                'value' => $item->id,
                'label' => sprintf(
                    '%s%s',
                    $item->translated('name', 'ro') ?: $item->translated('name', 'en') ?: 'Categorie',
                    $item->parent_id ? ' · subcategorie' : ''
                ),
                'type' => $item->type,
            ])
            ->values()
            ->all();
    }

    private function createsCycle(Category $category, Category $parent): bool
    {
        if (! $category->exists) {
            return false;
        }

        $current = $parent;

        while ($current) {
            if ((int) $current->id === (int) $category->id) {
                return true;
            }

            $current = $current->parent;
        }

        return false;
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
