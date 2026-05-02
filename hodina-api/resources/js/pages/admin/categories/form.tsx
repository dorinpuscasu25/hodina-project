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
import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';

interface LocaleOption {
    code: string;
    label: string;
}

interface TypeOption {
    value: string;
    label: string;
}

interface ParentOption {
    value: number;
    label: string;
    type: string;
}

interface CategoryFormData {
    id: number | null;
    type: string;
    parent_id: number | null;
    name: Record<string, string>;
    description: Record<string, string>;
    image_url: string | null;
    image_file: File | null;
    remove_image: boolean;
    card_background: string;
    accent_color: string;
    sort_order: number;
    is_active: boolean;
}

interface CategoryFormPageProps {
    mode: 'create' | 'edit';
    category: Omit<CategoryFormData, 'image_file' | 'remove_image'>;
    typeOptions: TypeOption[];
    parentOptions: ParentOption[];
    locales: LocaleOption[];
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizePayload = (data: CategoryFormData) => ({
    ...data,
    parent_id: data.parent_id ?? '',
    is_active: data.is_active ? '1' : '0',
    remove_image: data.remove_image ? '1' : '0',
});

const selectClassName =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]';

export default function CategoryFormPage({
    mode,
    category,
    typeOptions,
    parentOptions,
    locales,
}: CategoryFormPageProps) {
    const isEdit = mode === 'edit' && category.id !== null;
    const [activeLocale, setActiveLocale] = useState('en');
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const form = useForm<CategoryFormData>({
        ...clone(category),
        image_file: null,
        remove_image: false,
    });
    const previewUrl = useMemo(
        () =>
            form.data.remove_image
                ? null
                : (localPreview ?? form.data.image_url ?? null),
        [form.data.image_url, form.data.remove_image, localPreview],
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Categorii', href: '/admin/categories' },
        {
            title: isEdit ? 'Editeaza' : 'Adauga',
            href: isEdit
                ? `/admin/categories/${category.id}/edit`
                : '/admin/categories/create',
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isEdit) {
            if (form.data.image_file) {
                form.transform((data) => ({
                    ...normalizePayload(data),
                    _method: 'patch',
                }));
                form.post(`/admin/categories/${category.id}`, {
                    preserveScroll: true,
                    forceFormData: true,
                });
                return;
            }

            form.transform(normalizePayload);
            form.patch(`/admin/categories/${category.id}`, {
                preserveScroll: true,
            });
            return;
        }

        form.transform(normalizePayload);
        form.post('/admin/categories', {
            preserveScroll: true,
            forceFormData: Boolean(form.data.image_file),
        });
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        form.setData('image_file', file);
        form.setData('remove_image', false);
        setLocalPreview(file ? URL.createObjectURL(file) : null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Editeaza categorie' : 'Adauga categorie'} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {isEdit ? 'Editeaza categorie' : 'Adauga categorie'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Configurează categorii și subcategorii cu aceeași
                            logică de ierarhie folosită apoi în experiențe.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/admin/categories">Inapoi la lista</Link>
                    </Button>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Datele catalogului</CardTitle>
                        <CardDescription>
                            Numele este obligatoriu in toate cele trei limbi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tip</Label>
                                    <select
                                        id="type"
                                        className={selectClassName}
                                        value={form.data.type}
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                type: event.target.value,
                                                parent_id: null,
                                            }))
                                        }
                                    >
                                        {typeOptions.map((type) => (
                                            <option
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={form.errors.type} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="parent_id">
                                        Categorie părinte
                                    </Label>
                                    <select
                                        id="parent_id"
                                        className={selectClassName}
                                        value={form.data.parent_id ?? ''}
                                        onChange={(event) =>
                                            form.setData(
                                                'parent_id',
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : null,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Fără părinte (categorie principală)
                                        </option>
                                        {parentOptions
                                            .filter(
                                                (option) =>
                                                    option.type ===
                                                    form.data.type,
                                            )
                                            .map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                    </select>
                                    <InputError
                                        message={form.errors.parent_id}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Ordine</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={form.data.sort_order}
                                        onChange={(event) =>
                                            form.setData(
                                                'sort_order',
                                                Number(event.target.value || 0),
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <Label htmlFor="image_file">Imagine</Label>
                                    <Input
                                        id="image_file"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    <InputError
                                        message={form.errors.image_file}
                                    />
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div
                                            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border"
                                            style={{
                                                backgroundColor:
                                                    form.data.card_background,
                                            }}
                                        >
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span
                                                    className="text-lg font-semibold"
                                                    style={{
                                                        color: form.data
                                                            .accent_color,
                                                    }}
                                                >
                                                    {(
                                                        form.data.name.en ||
                                                        form.data.name.ro ||
                                                        form.data.name.ru ||
                                                        '?'
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            <p>
                                                PNG/JPG din calculator. Imaginea
                                                apare in selectorul de categorii
                                                din dashboard.
                                            </p>
                                            {previewUrl ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        form.setData(
                                                            'image_file',
                                                            null,
                                                        );
                                                        form.setData(
                                                            'remove_image',
                                                            true,
                                                        );
                                                        setLocalPreview(null);
                                                    }}
                                                >
                                                    Scoate imaginea
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="card_background">
                                        Background card
                                    </Label>
                                    <Input
                                        id="card_background"
                                        type="color"
                                        value={form.data.card_background}
                                        onChange={(event) =>
                                            form.setData(
                                                'card_background',
                                                event.target.value,
                                            )
                                        }
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="accent_color">Accent</Label>
                                    <Input
                                        id="accent_color"
                                        type="color"
                                        value={form.data.accent_color}
                                        onChange={(event) =>
                                            form.setData(
                                                'accent_color',
                                                event.target.value,
                                            )
                                        }
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="is_active">Status</Label>
                                    <select
                                        id="is_active"
                                        className={selectClassName}
                                        value={form.data.is_active ? '1' : '0'}
                                        onChange={(event) =>
                                            form.setData(
                                                'is_active',
                                                event.target.value === '1',
                                            )
                                        }
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Traduceri</Label>
                                <p className="text-xs text-muted-foreground">
                                    Numele e obligatoriu minim într-o limbă.
                                    Celelalte se completează automat cu prima
                                    traducere existentă.
                                </p>
                                <LocaleTabs
                                    locales={locales}
                                    active={activeLocale}
                                    onChange={setActiveLocale}
                                />
                                {form.errors.name ? (
                                    <p className="text-sm text-destructive">
                                        {form.errors.name}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Nume ({activeLocale.toUpperCase()})
                                    </Label>
                                    <Input
                                        id="name"
                                        value={
                                            form.data.name[activeLocale] ?? ''
                                        }
                                        onChange={(event) =>
                                            form.setData('name', {
                                                ...form.data.name,
                                                [activeLocale]:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                    <InputError
                                        message={
                                            form.errors[`name.${activeLocale}`]
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Descriere ({activeLocale.toUpperCase()})
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={
                                            form.data.description[
                                                activeLocale
                                            ] ?? ''
                                        }
                                        onChange={(event) =>
                                            form.setData('description', {
                                                ...form.data.description,
                                                [activeLocale]:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={form.processing}>
                                    {isEdit
                                        ? 'Salveaza modificarile'
                                        : 'Creeaza categoria'}
                                </Button>
                                <Button asChild type="button" variant="outline">
                                    <Link href="/admin/categories">
                                        Renunta
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
