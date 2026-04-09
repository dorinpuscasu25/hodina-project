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
    { title: 'Categorii', href: '/admin/categories' },
];

interface CategoryRow {
    id: number;
    type: string;
    code: string | null;
    parent_name: string | null;
    image: string | null;
    sort_order: number;
    is_active: boolean;
    name: string;
    slug: string | null;
    card_background: string | null;
    accent_color: string | null;
    updated_at: string | null;
    created_at: string | null;
}

interface TypeOption {
    value: string;
    label: string;
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
    type: string;
    per_page: number;
}

interface CategoriesIndexProps {
    categories: Paginated<CategoryRow>;
    filters: Filters;
    typeOptions: TypeOption[];
    perPageOptions: number[];
}

export default function CategoriesIndex({
    categories,
    filters,
    typeOptions,
    perPageOptions,
}: CategoriesIndexProps) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            '/admin/categories',
            {
                search,
                type: filters.type,
                per_page: filters.per_page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const updateType = (value: string) => {
        router.get(
            '/admin/categories',
            {
                search: filters.search,
                type: value,
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
            <Head title="Categorii" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <Card className="gap-0 overflow-hidden">
                    <CardHeader className="gap-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-3xl">
                                    Categorii
                                </CardTitle>
                                <CardDescription>
                                    Catalog tabelar cu search, filtre,
                                    paginare și ierarhie categorie /
                                    subcategorie.
                                </CardDescription>
                            </div>

                            <Button asChild>
                                <Link href="/admin/categories/create">
                                    <Plus className="size-4" />
                                    Create Category
                                </Link>
                            </Button>
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
                                        placeholder="Search categories..."
                                        className="pl-10"
                                    />
                                </div>
                                <Button type="submit" variant="outline">
                                    Cauta
                                </Button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={
                                        filters.type === '' ? 'default' : 'outline'
                                    }
                                    onClick={() => updateType('')}
                                >
                                    All
                                </Button>
                                {typeOptions.map((type) => (
                                    <Button
                                        key={type.value}
                                        type="button"
                                        variant={
                                            filters.type === type.value
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => updateType(type.value)}
                                    >
                                        {type.label}
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
                                            ID
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Preview
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Părinte
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Slug
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Position
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Active
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
                                    {categories.data.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="px-4 py-10 text-center text-muted-foreground"
                                            >
                                                Nu exista rezultate.
                                            </td>
                                        </tr>
                                    ) : (
                                        categories.data.map((category) => (
                                            <tr
                                                key={category.id}
                                                className="border-t align-top"
                                            >
                                                <td className="px-4 py-4">
                                                    {category.id}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <Link
                                                            href={`/admin/categories/${category.id}/edit`}
                                                            className="font-medium transition hover:text-primary"
                                                        >
                                                            {category.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {category.code || '-'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div
                                                        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border"
                                                        style={{
                                                            backgroundColor:
                                                                category.card_background ??
                                                                '#eefbf2',
                                                        }}
                                                    >
                                                        {category.image ? (
                                                            <img
                                                                src={category.image}
                                                                alt={category.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span
                                                                className="font-semibold"
                                                                style={{
                                                                    color:
                                                                        category.accent_color ??
                                                                        '#0f8f47',
                                                                }}
                                                            >
                                                                {category.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {category.parent_name ??
                                                        'Categorie principală'}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {category.type}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {category.slug || '-'}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {category.sort_order}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={
                                                            category.is_active
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {category.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground">
                                                    {category.updated_at
                                                        ? new Date(
                                                              category.updated_at,
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
                                                            href={`/admin/categories/${category.id}/edit`}
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
                            pagination={categories}
                            path="/admin/categories"
                            filters={filters}
                            perPageOptions={perPageOptions}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
