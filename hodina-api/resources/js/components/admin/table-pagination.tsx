import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';

interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface TablePaginationProps {
    pagination: PaginationData;
    path: string;
    filters: Record<string, string | number | null | undefined>;
    perPageOptions?: number[];
}

const normalizeQuery = (
    payload: Record<string, string | number | null | undefined>,
) =>
    Object.fromEntries(
        Object.entries(payload).filter(
            ([, value]) => value !== '' && value !== null && value !== undefined,
        ),
    );

export default function TablePagination({
    pagination,
    path,
    filters,
    perPageOptions = [10, 25, 50],
}: TablePaginationProps) {
    const navigate = (page: number, perPage = pagination.per_page) => {
        router.get(
            path,
            normalizeQuery({
                ...filters,
                page,
                per_page: perPage,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <div className="flex flex-col gap-4 border-t px-4 py-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <p>
                {pagination.total > 0
                    ? `Afisezi ${pagination.from}-${pagination.to} din ${pagination.total}`
                    : 'Nu exista rezultate'}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex items-center gap-3">
                    <span>Rows per page</span>
                    <select
                        className="h-9 rounded-md border bg-transparent px-3 text-sm text-foreground"
                        value={pagination.per_page}
                        onChange={(event) =>
                            navigate(1, Number(event.target.value))
                        }
                    >
                        {perPageOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex items-center gap-3 text-foreground">
                    <span>
                        Page {pagination.current_page} of{' '}
                        {Math.max(pagination.last_page, 1)}
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(1)}
                            disabled={pagination.current_page <= 1}
                        >
                            <ChevronsLeft className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                                navigate(Math.max(pagination.current_page - 1, 1))
                            }
                            disabled={pagination.current_page <= 1}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                                navigate(
                                    Math.min(
                                        pagination.current_page + 1,
                                        pagination.last_page,
                                    ),
                                )
                            }
                            disabled={
                                pagination.current_page >= pagination.last_page
                            }
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(pagination.last_page)}
                            disabled={
                                pagination.current_page >= pagination.last_page
                            }
                        >
                            <ChevronsRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
