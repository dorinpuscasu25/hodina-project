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
    { title: 'Hosts', href: '/admin/guesthouses' },
];

interface GuesthouseRow {
    id: number;
    name: string;
    slug: string;
    public_email: string | null;
    public_phone: string | null;
    locale: string;
    currency: string;
    city: string | null;
    country: string;
    is_active: boolean;
    hosts_count: number;
    experiences_count: number;
    accommodations_count: number;
    bookings_count: number;
    created_at: string | null;
    updated_at: string | null;
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

interface GuesthousesIndexProps {
    guesthouses: Paginated<GuesthouseRow>;
    filters: Filters;
    perPageOptions: number[];
}

export default function GuesthousesIndex({
    guesthouses,
    filters,
    perPageOptions,
}: GuesthousesIndexProps) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            '/admin/guesthouses',
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
            <Head title="Hosts" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <Card className="gap-0 overflow-hidden">
                    <CardHeader className="gap-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-3xl">
                                    Hosts
                                </CardTitle>
                                <CardDescription>
                                    Tabel cu cautare si paginare pentru toate
                                    proprietatile din retea.
                                </CardDescription>
                            </div>

                            <Button asChild>
                                <Link href="/admin/guesthouses/create">
                                    <Plus className="size-4" />
                                    Adauga host
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
                                    placeholder="Search guesthouses..."
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
                                            Oras
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Contact
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Limba
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Inventar
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Updated
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right">
                                            Actiuni
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guesthouses.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Nu exista rezultate pentru
                                                filtrul curent.
                                            </td>
                                        </tr>
                                    ) : (
                                        guesthouses.data.map((guesthouse) => (
                                            <tr
                                                key={guesthouse.id}
                                                className="border-t align-top"
                                            >
                                                <td className="px-4 py-4">
                                                    {guesthouse.id}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <Link
                                                            href={`/admin/guesthouses/${guesthouse.id}/edit`}
                                                            className="font-medium text-foreground transition hover:text-primary"
                                                        >
                                                            {guesthouse.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {guesthouse.slug}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {guesthouse.city ||
                                                        'Fara oras'}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    <div>
                                                        {guesthouse.public_email ||
                                                            'Fara email'}
                                                    </div>
                                                    <div>
                                                        {guesthouse.public_phone ||
                                                            'Fara telefon'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="uppercase">
                                                        {guesthouse.locale}
                                                    </span>
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {guesthouse.currency}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    <div>
                                                        Host: {guesthouse.hosts_count}
                                                    </div>
                                                    <div>
                                                        Exp:{' '}
                                                        {
                                                            guesthouse.experiences_count
                                                        }{' '}
                                                        · Cazari:{' '}
                                                        {
                                                            guesthouse.accommodations_count
                                                        }
                                                    </div>
                                                    <div>
                                                        Rez:{' '}
                                                        {guesthouse.bookings_count}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            guesthouse.is_active
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {guesthouse.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {guesthouse.updated_at
                                                        ? new Date(
                                                              guesthouse.updated_at,
                                                          ).toLocaleString(
                                                              'ro-RO',
                                                          )
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            href={`/admin/guesthouses/${guesthouse.id}/edit`}
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
                            pagination={guesthouses}
                            path="/admin/guesthouses"
                            filters={filters}
                            perPageOptions={perPageOptions}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
