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
    { title: 'Atribute', href: '/admin/attributes' },
];

interface AttributeRow {
    id: number;
    key: string;
    input_type: string;
    entity_type: string;
    label: string;
    is_filterable: boolean;
    is_active: boolean;
    options_count: number;
    categories_count: number;
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

interface Option {
    value: string;
    label: string;
}

interface Props {
    attributes: Paginated<AttributeRow>;
    filters: Filters;
    perPageOptions: number[];
    inputTypes: Option[];
    entityTypes: Option[];
}

export default function AttributesIndex({ attributes, filters, perPageOptions }: Props) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/admin/attributes', { search, per_page: filters.per_page }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Atribute" />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <Card className="gap-0 overflow-hidden">
                    <CardHeader className="gap-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-3xl">Atribute</CardTitle>
                                <CardDescription>
                                    Atribute dinamice (select, range, radio, checkbox) folosite în formulare
                                    și filtre de căutare avansată.
                                </CardDescription>
                            </div>
                            <Button asChild>
                                <Link href="/admin/attributes/create">
                                    <Plus className="size-4" />
                                    Adaugă atribut
                                </Link>
                            </Button>
                        </div>
                        <form onSubmit={submitSearch} className="flex max-w-xl gap-3">
                            <div className="relative flex-1">
                                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Caută după cheie sau etichetă..."
                                    className="pl-10"
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                Caută
                            </Button>
                        </form>
                    </CardHeader>

                    <CardContent className="px-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Cheie</th>
                                        <th className="px-4 py-3 font-medium">Etichetă</th>
                                        <th className="px-4 py-3 font-medium">Tip input</th>
                                        <th className="px-4 py-3 font-medium">Entitate</th>
                                        <th className="px-4 py-3 font-medium">Opțiuni</th>
                                        <th className="px-4 py-3 font-medium">Categorii</th>
                                        <th className="px-4 py-3 font-medium">Filtru</th>
                                        <th className="px-4 py-3 font-medium">Activ</th>
                                        <th className="px-4 py-3 font-medium text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attributes.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                                                Nu există atribute configurate. Adaugă primul.
                                            </td>
                                        </tr>
                                    ) : (
                                        attributes.data.map((attribute) => (
                                            <tr key={attribute.id} className="border-t">
                                                <td className="px-4 py-3 font-mono text-xs">{attribute.key}</td>
                                                <td className="px-4 py-3 font-medium">{attribute.label}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline">{attribute.input_type}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {attribute.entity_type}
                                                </td>
                                                <td className="px-4 py-3">{attribute.options_count}</td>
                                                <td className="px-4 py-3">{attribute.categories_count}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={attribute.is_filterable ? 'default' : 'outline'}>
                                                        {attribute.is_filterable ? 'Da' : 'Nu'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={attribute.is_active ? 'default' : 'outline'}>
                                                        {attribute.is_active ? 'Da' : 'Nu'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/admin/attributes/${attribute.id}/edit`}>
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
                            pagination={attributes}
                            path="/admin/attributes"
                            filters={filters}
                            perPageOptions={perPageOptions}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
