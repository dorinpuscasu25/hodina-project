<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\InteractsWithAdminTables;
use App\Http\Controllers\Admin\Concerns\InteractsWithTranslatedFields;
use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\AttributeOption;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttributeController extends Controller
{
    use InteractsWithAdminTables, InteractsWithTranslatedFields;

    public function index(Request $request): Response
    {
        $search = $this->searchTerm($request);
        $perPage = $this->perPage($request);
        $like = $this->like($search);

        $attributes = Attribute::query()
            ->with(['options', 'categories'])
            ->when($search, function ($query) use ($like) {
                $query->where(function ($q) use ($like) {
                    $q->where('key', 'like', $like)
                        ->orWhereRaw('LOWER(CAST(label AS TEXT)) LIKE ?', [$like]);
                });
            })
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Attribute $attribute) => $this->attributeRow($attribute));

        return Inertia::render('admin/attributes/index', [
            'attributes' => $attributes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'perPageOptions' => $this->perPageOptions(),
            'inputTypes' => $this->inputTypeOptions(),
            'entityTypes' => $this->entityTypeOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/attributes/form', [
            'mode' => 'create',
            'attribute' => $this->attributeFormData(),
            'inputTypes' => $this->inputTypeOptions(),
            'entityTypes' => $this->entityTypeOptions(),
            'categoryOptions' => $this->categoryOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function edit(Attribute $attribute): Response
    {
        $attribute->load(['options', 'categories']);

        return Inertia::render('admin/attributes/form', [
            'mode' => 'edit',
            'attribute' => $this->attributeFormData($attribute),
            'inputTypes' => $this->inputTypeOptions(),
            'entityTypes' => $this->entityTypeOptions(),
            'categoryOptions' => $this->categoryOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->persist($request, new Attribute());
    }

    public function update(Request $request, Attribute $attribute): RedirectResponse
    {
        return $this->persist($request, $attribute);
    }

    public function destroy(Attribute $attribute): RedirectResponse
    {
        $attribute->delete();
        return to_route('admin.attributes.index');
    }

    private function persist(Request $request, Attribute $attribute): RedirectResponse
    {
        $rules = [
            'key' => [
                'required', 'string', 'max:80',
                Rule::unique('attributes', 'key')->ignore($attribute->id),
            ],
            'input_type' => ['required', Rule::in(Attribute::inputTypes())],
            'entity_type' => ['required', Rule::in(Attribute::entityTypes())],
            'unit' => ['nullable', 'string', 'max:40'],
            'icon' => ['nullable', 'string', 'max:60'],
            'is_filterable' => ['required', 'boolean'],
            'is_required' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'label' => ['required', 'array'],
            'description' => ['nullable', 'array'],
            'config' => ['nullable', 'array'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'options' => ['nullable', 'array'],
            'options.*.value' => ['required_with:options', 'string', 'max:80'],
            'options.*.label' => ['required_with:options', 'array'],
            'options.*.color' => ['nullable', 'string', 'max:40'],
            'options.*.icon' => ['nullable', 'string', 'max:60'],
            'options.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];

        foreach ($this->supportedLocales() as $locale) {
            $rules["label.{$locale}"] = ['nullable', 'string', 'max:255'];
            $rules["description.{$locale}"] = ['nullable', 'string'];
        }

        $validated = $request->validate($rules);

        $hasLabel = collect($validated['label'] ?? [])
            ->contains(fn ($value) => filled(trim((string) $value)));
        if (! $hasLabel) {
            return back()->withErrors(['label' => 'Adaugă o etichetă într-o limbă.'])->withInput();
        }

        $attribute->fill([
            'key' => Str::slug($validated['key'], '_'),
            'input_type' => $validated['input_type'],
            'entity_type' => $validated['entity_type'],
            'unit' => $validated['unit'] ?? null,
            'icon' => $validated['icon'] ?? null,
            'is_filterable' => $validated['is_filterable'],
            'is_required' => $validated['is_required'],
            'is_active' => $validated['is_active'],
            'sort_order' => $validated['sort_order'] ?? 0,
            'label' => $this->normalizeTranslations($validated['label'], true),
            'description' => $this->normalizeTranslations($validated['description'] ?? []),
            'config' => $validated['config'] ?? [],
        ]);
        $attribute->save();

        $attribute->categories()->sync($validated['category_ids'] ?? []);

        $keepIds = [];
        foreach ($validated['options'] ?? [] as $index => $option) {
            $payload = [
                'value' => Str::slug((string) $option['value'], '_'),
                'label' => $this->normalizeTranslations($option['label'] ?? [], true),
                'color' => $option['color'] ?? null,
                'icon' => $option['icon'] ?? null,
                'sort_order' => (int) ($option['sort_order'] ?? $index),
            ];

            $id = isset($option['id']) ? (int) $option['id'] : null;
            if ($id) {
                $record = AttributeOption::query()->where('attribute_id', $attribute->id)->find($id);
                if ($record) {
                    $record->fill($payload)->save();
                    $keepIds[] = $record->id;
                    continue;
                }
            }
            $record = $attribute->options()->create($payload);
            $keepIds[] = $record->id;
        }

        $attribute->options()->whereNotIn('id', $keepIds ?: [0])->delete();

        return to_route('admin.attributes.index');
    }

    private function attributeRow(Attribute $attribute): array
    {
        return [
            'id' => $attribute->id,
            'key' => $attribute->key,
            'input_type' => $attribute->input_type,
            'entity_type' => $attribute->entity_type,
            'label' => $attribute->translated('label', 'ro') ?: $attribute->translated('label', 'en'),
            'is_filterable' => $attribute->is_filterable,
            'is_active' => $attribute->is_active,
            'options_count' => $attribute->options->count(),
            'categories_count' => $attribute->categories->count(),
            'updated_at' => $attribute->updated_at?->toIso8601String(),
        ];
    }

    private function attributeFormData(?Attribute $attribute = null): array
    {
        if ($attribute) {
            return [
                'id' => $attribute->id,
                'key' => $attribute->key,
                'input_type' => $attribute->input_type,
                'entity_type' => $attribute->entity_type,
                'unit' => $attribute->unit ?? '',
                'icon' => $attribute->icon ?? '',
                'is_filterable' => $attribute->is_filterable,
                'is_required' => $attribute->is_required,
                'is_active' => $attribute->is_active,
                'sort_order' => $attribute->sort_order,
                'label' => $this->translationsFor($attribute, 'label'),
                'description' => $this->translationsFor($attribute, 'description'),
                'config' => $attribute->config ?? [],
                'category_ids' => $attribute->categories->pluck('id')->all(),
                'options' => $attribute->options->map(fn (AttributeOption $option) => [
                    'id' => $option->id,
                    'value' => $option->value,
                    'label' => $this->translationsFor($option, 'label'),
                    'color' => $option->color ?? '',
                    'icon' => $option->icon ?? '',
                    'sort_order' => $option->sort_order,
                ])->all(),
            ];
        }

        return [
            'id' => null,
            'key' => '',
            'input_type' => Attribute::TYPE_SELECT,
            'entity_type' => Attribute::ENTITY_BOTH,
            'unit' => '',
            'icon' => '',
            'is_filterable' => true,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 0,
            'label' => $this->emptyTranslations(),
            'description' => $this->emptyTranslations(),
            'config' => [],
            'category_ids' => [],
            'options' => [],
        ];
    }

    private function inputTypeOptions(): array
    {
        return collect(Attribute::inputTypes())
            ->map(fn (string $type) => ['value' => $type, 'label' => ucfirst($type)])
            ->all();
    }

    private function entityTypeOptions(): array
    {
        return [
            ['value' => Attribute::ENTITY_EXPERIENCE, 'label' => 'Experience'],
            ['value' => Attribute::ENTITY_ACCOMMODATION, 'label' => 'Accommodation'],
            ['value' => Attribute::ENTITY_BOTH, 'label' => 'Both'],
        ];
    }

    private function categoryOptions(): array
    {
        return Category::query()
            ->orderBy('type')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Category $category) => [
                'value' => $category->id,
                'label' => ($category->translated('name', 'ro') ?: $category->translated('name', 'en') ?: 'Categorie') . ' · ' . $category->type,
                'type' => $category->type,
            ])
            ->values()
            ->all();
    }
}
