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
import { type FormEvent, useState } from 'react';

interface LocaleOption {
    code: string;
    label: string;
}

interface CurrencyOption {
    code: string;
    label: string;
}

interface GuesthouseFormData {
    id: number | null;
    name: Record<string, string>;
    description: Record<string, string>;
    check_in_notes: Record<string, string>;
    house_rules: Record<string, string>;
    slug: string;
    public_email: string;
    public_phone: string;
    locale: string;
    currency: string;
    country: string;
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    cover_image: string;
    is_active: boolean;
}

interface GuesthouseFormPageProps {
    mode: 'create' | 'edit';
    guesthouse: GuesthouseFormData;
    locales: LocaleOption[];
    currencyOptions: CurrencyOption[];
}

const clone = <T,>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;

const selectClassName =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]';

export default function GuesthouseFormPage({
    mode,
    guesthouse,
    locales,
    currencyOptions,
}: GuesthouseFormPageProps) {
    const isEdit = mode === 'edit' && guesthouse.id !== null;
    const [activeLocale, setActiveLocale] = useState(guesthouse.locale || 'ro');
    const form = useForm<GuesthouseFormData>(clone(guesthouse));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Pensiuni', href: '/admin/guesthouses' },
        {
            title: isEdit ? 'Editeaza' : 'Adauga',
            href: isEdit
                ? `/admin/guesthouses/${guesthouse.id}/edit`
                : '/admin/guesthouses/create',
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isEdit) {
            form.patch(`/admin/guesthouses/${guesthouse.id}`, {
                preserveScroll: true,
            });
            return;
        }

        form.post('/admin/guesthouses', {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Editeaza pensiune' : 'Adauga pensiune'} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {isEdit ? 'Editeaza pensiune' : 'Adauga pensiune'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Formular separat pentru configurarea completa a
                            proprietatii.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/admin/guesthouses">Inapoi la lista</Link>
                    </Button>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Date generale</CardTitle>
                        <CardDescription>
                            Traducerile raman pe taburi, iar limba profilului
                            controleaza ce vede pensiunea in dashboardul ei.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-3">
                                <Label>Continut traductibil</Label>
                                <LocaleTabs
                                    locales={locales}
                                    active={activeLocale}
                                    onChange={setActiveLocale}
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="name">
                                        Nume ({activeLocale.toUpperCase()})
                                    </Label>
                                    <Input
                                        id="name"
                                        value={form.data.name[activeLocale] ?? ''}
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

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">
                                        Descriere ({activeLocale.toUpperCase()})
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={
                                            form.data.description[activeLocale] ??
                                            ''
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

                                <div className="space-y-2">
                                    <Label htmlFor="check_in_notes">
                                        Note check-in (
                                        {activeLocale.toUpperCase()})
                                    </Label>
                                    <Textarea
                                        id="check_in_notes"
                                        value={
                                            form.data.check_in_notes[
                                                activeLocale
                                            ] ?? ''
                                        }
                                        onChange={(event) =>
                                            form.setData('check_in_notes', {
                                                ...form.data.check_in_notes,
                                                [activeLocale]:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="house_rules">
                                        Regulile casei (
                                        {activeLocale.toUpperCase()})
                                    </Label>
                                    <Textarea
                                        id="house_rules"
                                        value={
                                            form.data.house_rules[activeLocale] ??
                                            ''
                                        }
                                        onChange={(event) =>
                                            form.setData('house_rules', {
                                                ...form.data.house_rules,
                                                [activeLocale]:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        value={form.data.slug}
                                        onChange={(event) =>
                                            form.setData(
                                                'slug',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.slug} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="locale">Limba profilului</Label>
                                    <select
                                        id="locale"
                                        className={selectClassName}
                                        value={form.data.locale}
                                        onChange={(event) =>
                                            form.setData(
                                                'locale',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {locales.map((locale) => (
                                            <option
                                                key={locale.code}
                                                value={locale.code}
                                            >
                                                {locale.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="public_email">Email public</Label>
                                    <Input
                                        id="public_email"
                                        type="email"
                                        value={form.data.public_email}
                                        onChange={(event) =>
                                            form.setData(
                                                'public_email',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.public_email}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="public_phone">
                                        Telefon public
                                    </Label>
                                    <Input
                                        id="public_phone"
                                        value={form.data.public_phone}
                                        onChange={(event) =>
                                            form.setData(
                                                'public_phone',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="currency">Valuta</Label>
                                    <select
                                        id="currency"
                                        className={selectClassName}
                                        value={form.data.currency}
                                        onChange={(event) =>
                                            form.setData(
                                                'currency',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {currencyOptions.map((currency) => (
                                            <option
                                                key={currency.code}
                                                value={currency.code}
                                            >
                                                {currency.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country">Tara</Label>
                                    <Input
                                        id="country"
                                        value={form.data.country}
                                        onChange={(event) =>
                                            form.setData(
                                                'country',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.country} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">Oras</Label>
                                    <Input
                                        id="city"
                                        value={form.data.city}
                                        onChange={(event) =>
                                            form.setData(
                                                'city',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Adresa</Label>
                                    <Input
                                        id="address"
                                        value={form.data.address}
                                        onChange={(event) =>
                                            form.setData(
                                                'address',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="latitude">Latitudine</Label>
                                    <Input
                                        id="latitude"
                                        value={form.data.latitude}
                                        onChange={(event) =>
                                            form.setData(
                                                'latitude',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.latitude}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="longitude">Longitudine</Label>
                                    <Input
                                        id="longitude"
                                        value={form.data.longitude}
                                        onChange={(event) =>
                                            form.setData(
                                                'longitude',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.longitude}
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="cover_image">
                                        Imagine cover
                                    </Label>
                                    <Input
                                        id="cover_image"
                                        value={form.data.cover_image}
                                        onChange={(event) =>
                                            form.setData(
                                                'cover_image',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="URL sau path"
                                    />
                                    <InputError
                                        message={form.errors.cover_image}
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

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={form.processing}>
                                    {isEdit
                                        ? 'Salveaza modificarile'
                                        : 'Creeaza pensiunea'}
                                </Button>
                                <Button asChild type="button" variant="outline">
                                    <Link href="/admin/guesthouses">
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
