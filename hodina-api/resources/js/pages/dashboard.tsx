import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <Badge
                                variant="secondary"
                                className="bg-white/10 text-white"
                            >
                                Cont autentificat
                            </Badge>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    {auth.user.name}
                                </h1>
                                <p className="max-w-2xl text-sm text-slate-200">
                                    Acest panou web gestioneaza doar accesul de
                                    administrare si setarile contului. Clientii
                                    si hostsle folosesc frontendurile lor
                                    dedicate, conectate prin API.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href="/settings/profile"
                                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                                Profil
                            </Link>
                            <Link
                                href="/settings/password"
                                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                            >
                                Securitate
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rol</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold capitalize">
                                {auth.user.role}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Accesul in platforma este controlat separat
                                pentru admin, host si guest.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Email verificat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">
                                {auth.user.email_verified_at ? 'Da' : 'Nu'}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Confirmarea emailului este necesara pentru
                                fluxurile principale de autentificare.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Limba contului</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold uppercase">
                                {auth.user.locale ?? 'ro'}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Timpul si comunicarea sunt setate pentru
                                utilizatorul autentificat.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
