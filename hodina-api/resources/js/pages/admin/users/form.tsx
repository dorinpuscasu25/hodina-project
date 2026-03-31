import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

interface LocaleOption {
    code: string;
    label: string;
}

interface RoleOption {
    value: string;
    label: string;
}

interface GuesthouseOption {
    id: number;
    name: string;
}

interface UserFormData {
    id: number | null;
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    guesthouse_role: string;
    phone: string;
    locale: string;
    timezone: string;
    guesthouse_id: number | '';
    is_active: boolean;
}

interface UserFormPageProps {
    mode: 'create' | 'edit';
    user: UserFormData;
    guesthouseOptions: GuesthouseOption[];
    roleOptions: RoleOption[];
    guesthouseRoleOptions: RoleOption[];
    locales: LocaleOption[];
}

const clone = <T,>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;

const selectClassName =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]';

export default function UserFormPage({
    mode,
    user,
    guesthouseOptions,
    roleOptions,
    guesthouseRoleOptions,
    locales,
}: UserFormPageProps) {
    const isEdit = mode === 'edit' && user.id !== null;
    const form = useForm<UserFormData>(clone(user));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin' },
        { title: 'Utilizatori', href: '/admin/users' },
        {
            title: isEdit ? 'Editeaza' : 'Adauga',
            href: isEdit ? `/admin/users/${user.id}/edit` : '/admin/users/create',
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isEdit) {
            form.patch(`/admin/users/${user.id}`, {
                preserveScroll: true,
            });
            return;
        }

        form.post('/admin/users', {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Editeaza utilizator' : 'Adauga utilizator'} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {isEdit ? 'Editeaza utilizator' : 'Adauga utilizator'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Formular dedicat pentru conturi admin, host si guest.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/admin/users">Inapoi la lista</Link>
                    </Button>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Datele contului</CardTitle>
                        <CardDescription>
                            Email verification ramane activa pentru conturile
                            noi si pentru emailurile schimbate.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            {isEdit ? (
                                <Alert>
                                    <AlertTitle>
                                        Parola este optionala
                                    </AlertTitle>
                                    <AlertDescription>
                                        Completezi campurile doar daca vrei sa o
                                        schimbi.
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nume</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.name} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(event) =>
                                            form.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.email} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Rol</Label>
                                    <select
                                        id="role"
                                        className={selectClassName}
                                        value={form.data.role}
                                        onChange={(event) =>
                                            form.setData(
                                                'role',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {roleOptions.map((role) => (
                                            <option
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guesthouse_id">Pensiune</Label>
                                    <select
                                        id="guesthouse_id"
                                        className={selectClassName}
                                        value={String(form.data.guesthouse_id)}
                                        onChange={(event) =>
                                            form.setData(
                                                'guesthouse_id',
                                                event.target.value
                                                    ? Number(event.target.value)
                                                    : '',
                                            )
                                        }
                                        disabled={form.data.role !== 'host'}
                                    >
                                        <option value="">Fara pensiune</option>
                                        {guesthouseOptions.map((guesthouse) => (
                                            <option
                                                key={guesthouse.id}
                                                value={guesthouse.id}
                                            >
                                                {guesthouse.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={form.errors.guesthouse_id}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guesthouse_role">
                                        Rol in pensiune
                                    </Label>
                                    <select
                                        id="guesthouse_role"
                                        className={selectClassName}
                                        value={form.data.guesthouse_role}
                                        onChange={(event) =>
                                            form.setData(
                                                'guesthouse_role',
                                                event.target.value,
                                            )
                                        }
                                        disabled={form.data.role !== 'host'}
                                    >
                                        {guesthouseRoleOptions.map((role) => (
                                            <option
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={form.errors.guesthouse_role}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefon</Label>
                                    <Input
                                        id="phone"
                                        value={form.data.phone}
                                        onChange={(event) =>
                                            form.setData(
                                                'phone',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="locale">Limba</Label>
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
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Input
                                        id="timezone"
                                        value={form.data.timezone}
                                        onChange={(event) =>
                                            form.setData(
                                                'timezone',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.timezone}
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

                                <div className="space-y-2">
                                    <Label htmlFor="password">Parola</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.data.password}
                                        onChange={(event) =>
                                            form.setData(
                                                'password',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.password}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirmare parola
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={form.data.password_confirmation}
                                        onChange={(event) =>
                                            form.setData(
                                                'password_confirmation',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button disabled={form.processing}>
                                    {isEdit
                                        ? 'Salveaza modificarile'
                                        : 'Creeaza utilizatorul'}
                                </Button>
                                <Button asChild type="button" variant="outline">
                                    <Link href="/admin/users">Renunta</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
