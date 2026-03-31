import TablePagination from '@/components/admin/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Utilizatori', href: '/admin/users' },
];

interface UserRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    locale: string;
    timezone: string;
    guesthouse_id: number | null;
    guesthouse_name: string | null;
    is_active: boolean;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string;
    per_page: number;
}

interface UsersIndexProps {
    users: Paginated<UserRow>;
    filters: Filters;
    perPageOptions: number[];
}

export default function UsersIndex({
    users,
    filters,
    perPageOptions,
}: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            '/admin/users',
            {
                search,
                per_page: filters.per_page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Utilizatori" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <Card className="gap-0 overflow-hidden">
                    <CardHeader className="gap-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-3xl">
                                    Utilizatori
                                </CardTitle>
                                <CardDescription>
                                    Tabel cu cautare, paginare si acces rapid
                                    catre formularele separate de creare si
                                    editare.
                                </CardDescription>
                            </div>

                            <Button asChild>
                                <Link href="/admin/users/create">
                                    <Plus className="size-4" />
                                    Adauga utilizator
                                </Link>
                            </Button>
                        </div>

                        <form
                            onSubmit={submitSearch}
                            className="flex flex-col gap-3 lg:flex-row lg:items-center"
                        >
                            <div className="relative max-w-xl flex-1">
                                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search users..."
                                    className="pl-10"
                                />
                            </div>

                            <Button type="submit" variant="outline">
                                Cauta
                            </Button>
                        </form>
                    </CardHeader>

                    <CardContent className="px-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            ID
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Nume
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Rol
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Pensiune
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Limba
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Verificat
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right">
                                            Actiuni
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Nu exista utilizatori pentru
                                                filtrul curent.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.data.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-t align-top"
                                            >
                                                <td className="px-4 py-4">
                                                    {user.id}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <Link
                                                            href={`/admin/users/${user.id}/edit`}
                                                            className="font-medium transition hover:text-primary"
                                                        >
                                                            {user.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {user.phone ||
                                                                'Fara telefon'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            user.role === 'admin'
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {user.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {user.guesthouse_name ||
                                                        '-'}
                                                </td>
                                                <td className="px-4 py-4 uppercase">
                                                    {user.locale}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            user.email_verified_at
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {user.email_verified_at
                                                            ? 'Da'
                                                            : 'Nu'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            user.is_active
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {user.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            href={`/admin/users/${user.id}/edit`}
                                                        >
                                                            Edit
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            pagination={users}
                            path="/admin/users"
                            filters={filters}
                            perPageOptions={perPageOptions}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
