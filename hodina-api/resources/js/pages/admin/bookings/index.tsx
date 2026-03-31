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
import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Rezervari', href: '/admin/bookings' },
];

interface BookingRow {
    id: number;
    booking_number: string;
    status: string;
    bookable_type: string;
    bookable_name: string | null;
    guesthouse_name: string | null;
    guest_name: string | null;
    guest_email: string | null;
    starts_at: string | null;
    ends_at: string | null;
    adults: number;
    children: number;
    units: number;
    total_amount: number;
    currency: string;
    special_requests: string | null;
    host_response: string | null;
    chat_enabled: boolean;
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
    status: string;
    per_page: number;
}

interface StatusOption {
    value: string;
    label: string;
}

interface StatusSummaryItem {
    status: string;
    value: number;
}

interface BookingsIndexProps {
    bookings: Paginated<BookingRow>;
    filters: Filters;
    statusOptions: StatusOption[];
    statusSummary: StatusSummaryItem[];
    perPageOptions: number[];
}

const statusVariant = (status: string) => {
    switch (status) {
        case 'confirmed':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'rejected':
        case 'cancelled':
            return 'destructive';
        default:
            return 'outline';
    }
};

export default function BookingsIndex({
    bookings,
    filters,
    statusOptions,
    statusSummary,
    perPageOptions,
}: BookingsIndexProps) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            '/admin/bookings',
            {
                search,
                status: filters.status,
                per_page: filters.per_page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const updateStatus = (value: string) => {
        router.get(
            '/admin/bookings',
            {
                search: filters.search,
                status: value,
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
            <Head title="Rezervari" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <div className="grid gap-4 md:grid-cols-5">
                    {statusSummary.map((item) => (
                        <Card key={item.status}>
                            <CardHeader className="pb-2">
                                <CardDescription className="capitalize">
                                    {item.status}
                                </CardDescription>
                                <CardTitle className="text-3xl">
                                    {item.value}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card className="gap-0 overflow-hidden">
                    <CardHeader className="gap-6">
                        <div className="space-y-2">
                            <CardTitle className="text-3xl">
                                Rezervari
                            </CardTitle>
                            <CardDescription>
                                Tabel cu cautare, filtru de status si paginare.
                            </CardDescription>
                        </div>

                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <form
                                onSubmit={submitSearch}
                                className="flex max-w-xl flex-1 gap-3"
                            >
                                <div className="relative flex-1">
                                    <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                                    <Input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search bookings..."
                                        className="pl-10"
                                    />
                                </div>
                                <Button type="submit" variant="outline">
                                    Cauta
                                </Button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map((status) => (
                                    <Button
                                        key={status.value || 'all'}
                                        type="button"
                                        variant={
                                            filters.status === status.value
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => updateStatus(status.value)}
                                    >
                                        {status.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="px-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Booking
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Guest
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Guesthouse
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Item
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Chat
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Nu exista rezervari pentru
                                                filtrul curent.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.data.map((booking) => (
                                            <tr
                                                key={booking.id}
                                                className="border-t align-top"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {
                                                                booking.booking_number
                                                            }
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {booking.created_at
                                                                ? new Date(
                                                                      booking.created_at,
                                                                  ).toLocaleString(
                                                                      'ro-RO',
                                                                  )
                                                                : '-'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    <div>
                                                        {booking.guest_name ||
                                                            '-'}
                                                    </div>
                                                    <div>
                                                        {booking.guest_email ||
                                                            '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {booking.guesthouse_name ||
                                                        '-'}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    <div>
                                                        {booking.bookable_name ||
                                                            booking.bookable_type}
                                                    </div>
                                                    <div className="text-xs">
                                                        {booking.adults} adulti ·{' '}
                                                        {booking.children} copii
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {booking.starts_at
                                                        ? new Date(
                                                              booking.starts_at,
                                                          ).toLocaleString(
                                                              'ro-RO',
                                                          )
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {new Intl.NumberFormat(
                                                        'ro-MD',
                                                        {
                                                            style: 'currency',
                                                            currency:
                                                                booking.currency,
                                                        },
                                                    ).format(
                                                        booking.total_amount,
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={statusVariant(
                                                            booking.status,
                                                        )}
                                                        className="capitalize"
                                                    >
                                                        {booking.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            booking.chat_enabled
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {booking.chat_enabled
                                                            ? 'Activ'
                                                            : 'Inchis'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <TablePagination
                            pagination={bookings}
                            path="/admin/bookings"
                            filters={filters}
                            perPageOptions={perPageOptions}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
