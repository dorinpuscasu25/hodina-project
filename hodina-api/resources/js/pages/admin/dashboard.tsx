import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
];

interface Metric {
    label: string;
    value: number;
    hint?: string;
}

interface RecentBooking {
    id: number;
    booking_number: string;
    status: string;
    guest_name: string | null;
    guesthouse_name: string | null;
    bookable_type: string;
    bookable_name: string | null;
    starts_at: string | null;
    total_amount: number;
    currency: string;
}

interface DashboardProps {
    stats: Metric[];
    bookingStatus: Metric[];
    catalogStats: Metric[];
    recentBookings: RecentBooking[];
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

export default function AdminDashboard({
    stats,
    bookingStatus,
    catalogStats,
    recentBookings,
}: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="rounded-3xl border bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 text-white shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <Badge
                                variant="secondary"
                                className="bg-white/10 text-white"
                            >
                                Hodina Control
                            </Badge>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    Admin custom pentru hosts, conturi si
                                    datele sistemului
                                </h1>
                                <p className="max-w-3xl text-sm text-slate-200">
                                    Aici controlezi retelele de hosts,
                                    utilizatorii, taxonomiile si rezervarile din
                                    backend, fara Nova si fara dependenta de un
                                    panou extern.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="secondary">
                                <Link href="/admin/guesthouses">
                                    Hosts
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                <Link href="/admin/categories">
                                    Categorii
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.label}>
                            <CardHeader className="gap-3">
                                <CardDescription>{stat.label}</CardDescription>
                                <CardTitle className="text-3xl">
                                    {stat.value}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {stat.hint}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rezervari recente</CardTitle>
                            <CardDescription>
                                Cele mai noi cereri din sistem, cu acces rapid
                                spre situatia operationala.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentBookings.length === 0 ? (
                                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                                    Nu exista rezervari inca.
                                </div>
                            ) : (
                                recentBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="rounded-2xl border p-4"
                                    >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">
                                                        {
                                                            booking.booking_number
                                                        }
                                                    </p>
                                                    <Badge
                                                        variant={statusVariant(
                                                            booking.status,
                                                        )}
                                                        className="capitalize"
                                                    >
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {booking.guest_name ??
                                                        'Fara nume'}{' '}
                                                    pentru{' '}
                                                    {booking.bookable_name ??
                                                        booking.bookable_type}{' '}
                                                    la{' '}
                                                    {booking.guesthouse_name ??
                                                        'Host necunoscuta'}
                                                </p>
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {booking.starts_at
                                                    ? new Date(
                                                          booking.starts_at,
                                                      ).toLocaleString(
                                                          'ro-RO',
                                                      )
                                                    : 'Data lipsa'}
                                                {' · '}
                                                {new Intl.NumberFormat(
                                                    'ro-MD',
                                                    {
                                                        style: 'currency',
                                                        currency:
                                                            booking.currency,
                                                    },
                                                ).format(booking.total_amount)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Status rezervari</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {bookingStatus.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="text-lg font-semibold">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Structura catalogului</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {catalogStats.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between rounded-xl border px-4 py-3"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="text-lg font-semibold">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
