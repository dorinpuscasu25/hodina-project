import LocaleTabs from '@/components/admin/locale-tabs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface LocaleOption {
    code: string;
    label: string;
}

interface Option {
    value: string;
    label: string;
    type?: string;
}

interface AttributeOptionItem {
    id: number | null;
    value: string;
    label: Record<string, string>;
    color: string;
    icon: string;
    sort_order: number;
}

interface AttributeFormData {
    id: number | null;
    key: string;
    input_type: string;
    entity_type: string;
    unit: string;
    icon: string;
    is_filterable: boolean;
    is_required: boolean;
    is_active: boolean;
    sort_order: number;
    label: Record<string, string>;
    description: Record<string, string>;
    config: {
        min?: number;
        max?: number;
        step?: number;
    };
    category_ids: number[];
    options: AttributeOptionItem[];
}

interface Props {
    mode: 'create' | 'edit';
    attribute: AttributeFormData;
    inputTypes: Option[];
    entityTypes: Option[];
    categoryOptions: Option[];
    locales: LocaleOption[];
}

const selectClassName =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const hasOptionsInput = (type: string) =>
    ['select', 'multiselect', 'radio'].includes(type);

const hasRangeConfig = (type: string) => ['number', 'range'].includes(type);

export default function AttributeFormPage({
    mode,
    attribute,
    inputTypes,
    entityTypes,
    categoryOptions,
    locales,
}: Props) {
    const isEdit = mode === 'edit' && attribute.id !== null;
    const [activeLocale, setActiveLocale] = useState('en');
    const form = useForm<AttributeFormData>(clone(attribute));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Atribute', href: '/admin/attributes' },
        {
            title: isEdit ? 'Editează' : 'Adaugă',
            href: isEdit ? `/admin/attributes/${attribute.id}/edit` : '/admin/attributes/create',
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isEdit) {
            form.transform((data) => ({ ...data, _method: 'patch' })).post(
                `/admin/attributes/${attribute.id}`,
                { preserveScroll: true },
            );
            return;
        }
        form.post('/admin/attributes', { preserveScroll: true });
    };

    const toggleCategory = (id: number) => {
        const exists = form.data.category_ids.includes(id);
        form.setData(
            'category_ids',
            exists ? form.data.category_ids.filter((c) => c !== id) : [...form.data.category_ids, id],
        );
    };

    const addOption = () => {
        const emptyLabel = locales.reduce<Record<string, string>>((acc, l) => ({ ...acc, [l.code]: '' }), {});
        form.setData('options', [
            ...form.data.options,
            {
                id: null,
                value: '',
                label: emptyLabel,
                color: '',
                icon: '',
                sort_order: form.data.options.length,
            },
        ]);
    };

    const updateOption = (index: number, patch: Partial<AttributeOptionItem>) => {
        form.setData(
            'options',
            form.data.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
        );
    };

    const removeOption = (index: number) => {
        form.setData(
            'options',
            form.data.options.filter((_, i) => i !== index),
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Editează atribut' : 'Adaugă atribut'} />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {isEdit ? 'Editează atribut' : 'Adaugă atribut'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Atributele sunt disponibile în formulare și filtrele de căutare în funcție de
                            categoriile asociate și tipul entității.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/admin/attributes">Înapoi la listă</Link>
                    </Button>
                </section>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurare</CardTitle>
                            <CardDescription>Cheia rămâne stabilă — e folosită în API și filtre.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="key">Cheie (lowercase)</Label>
                                    <Input
                                        id="key"
                                        value={form.data.key}
                                        onChange={(e) => form.setData('key', e.target.value)}
                                        placeholder="pet_friendly"
                                    />
                                    <InputError message={form.errors.key} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="input_type">Tip input</Label>
                                    <select
                                        id="input_type"
                                        className={selectClassName}
                                        value={form.data.input_type}
                                        onChange={(e) => form.setData('input_type', e.target.value)}
                                    >
                                        {inputTypes.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={form.errors.input_type} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="entity_type">Entitate</Label>
                                    <select
                                        id="entity_type"
                                        className={selectClassName}
                                        value={form.data.entity_type}
                                        onChange={(e) => form.setData('entity_type', e.target.value)}
                                    >
                                        {entityTypes.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unit">Unitate (opțional)</Label>
                                    <Input
                                        id="unit"
                                        value={form.data.unit}
                                        onChange={(e) => form.setData('unit', e.target.value)}
                                        placeholder="km, ore, €"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="icon">Icon (opțional)</Label>
                                    <Input
                                        id="icon"
                                        value={form.data.icon}
                                        onChange={(e) => form.setData('icon', e.target.value)}
                                        placeholder="paw, wifi, car"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Ordine</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        id="is_filterable"
                                        type="checkbox"
                                        checked={form.data.is_filterable}
                                        onChange={(e) => form.setData('is_filterable', e.target.checked)}
                                    />
                                    <Label htmlFor="is_filterable">Disponibil în filtrele de căutare</Label>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        id="is_required"
                                        type="checkbox"
                                        checked={form.data.is_required}
                                        onChange={(e) => form.setData('is_required', e.target.checked)}
                                    />
                                    <Label htmlFor="is_required">Obligatoriu la completarea listingului</Label>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={form.data.is_active}
                                        onChange={(e) => form.setData('is_active', e.target.checked)}
                                    />
                                    <Label htmlFor="is_active">Activ</Label>
                                </div>
                            </div>

                            {hasRangeConfig(form.data.input_type) ? (
                                <div className="mt-6 grid gap-5 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Min</Label>
                                        <Input
                                            type="number"
                                            value={form.data.config.min ?? ''}
                                            onChange={(e) =>
                                                form.setData('config', {
                                                    ...form.data.config,
                                                    min: e.target.value ? Number(e.target.value) : undefined,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max</Label>
                                        <Input
                                            type="number"
                                            value={form.data.config.max ?? ''}
                                            onChange={(e) =>
                                                form.setData('config', {
                                                    ...form.data.config,
                                                    max: e.target.value ? Number(e.target.value) : undefined,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pas</Label>
                                        <Input
                                            type="number"
                                            value={form.data.config.step ?? ''}
                                            onChange={(e) =>
                                                form.setData('config', {
                                                    ...form.data.config,
                                                    step: e.target.value ? Number(e.target.value) : undefined,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Etichetă și descriere</CardTitle>
                            <CardDescription>
                                Obligatoriu minim într-o limbă; restul se completează automat.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <LocaleTabs locales={locales} active={activeLocale} onChange={setActiveLocale} />
                            <div className="space-y-2">
                                <Label htmlFor="label">Etichetă ({activeLocale.toUpperCase()})</Label>
                                <Input
                                    id="label"
                                    value={form.data.label[activeLocale] ?? ''}
                                    onChange={(e) =>
                                        form.setData('label', { ...form.data.label, [activeLocale]: e.target.value })
                                    }
                                />
                                {form.errors.label ? (
                                    <p className="text-sm text-destructive">{form.errors.label}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descriere ({activeLocale.toUpperCase()})</Label>
                                <Textarea
                                    id="description"
                                    value={form.data.description[activeLocale] ?? ''}
                                    onChange={(e) =>
                                        form.setData('description', {
                                            ...form.data.description,
                                            [activeLocale]: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Categorii asociate</CardTitle>
                            <CardDescription>
                                Atributul va apărea în formularul de listing doar când una din aceste categorii e selectată.
                                Lasă gol ca să fie disponibil global.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {categoryOptions.map((cat) => (
                                    <label
                                        key={cat.value}
                                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.data.category_ids.includes(Number(cat.value))}
                                            onChange={() => toggleCategory(Number(cat.value))}
                                        />
                                        <span>{cat.label}</span>
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {hasOptionsInput(form.data.input_type) ? (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Opțiuni</CardTitle>
                                    <CardDescription>Valori disponibile pentru select / radio.</CardDescription>
                                </div>
                                <Button type="button" variant="outline" onClick={addOption}>
                                    <Plus className="size-4" /> Adaugă opțiune
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {form.data.options.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nicio opțiune adăugată. Atributul nu va fi selectabil.
                                    </p>
                                ) : null}
                                {form.data.options.map((option, index) => (
                                    <div key={index} className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
                                        <div className="space-y-2">
                                            <Label>Valoare</Label>
                                            <Input
                                                value={option.value}
                                                onChange={(e) => updateOption(index, { value: e.target.value })}
                                                placeholder="yes"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Label {activeLocale.toUpperCase()}</Label>
                                            <Input
                                                value={option.label[activeLocale] ?? ''}
                                                onChange={(e) =>
                                                    updateOption(index, {
                                                        label: {
                                                            ...option.label,
                                                            [activeLocale]: e.target.value,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Culoare</Label>
                                            <Input
                                                type="color"
                                                value={option.color || '#888888'}
                                                onChange={(e) => updateOption(index, { color: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1 space-y-2">
                                                <Label>Ordine</Label>
                                                <Input
                                                    type="number"
                                                    value={option.sort_order}
                                                    onChange={(e) =>
                                                        updateOption(index, {
                                                            sort_order: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removeOption(index)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null}

                    <div className="flex gap-3">
                        <Button disabled={form.processing}>
                            {isEdit ? 'Salvează modificările' : 'Creează atribut'}
                        </Button>
                        <Button asChild type="button" variant="outline">
                            <Link href="/admin/attributes">Renunță</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
