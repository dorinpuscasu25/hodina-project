<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Http\Request;

trait InteractsWithAdminTables
{
    protected function perPage(Request $request, int $default = 10): int
    {
        $perPage = (int) $request->input('per_page', $default);

        return in_array($perPage, $this->perPageOptions(), true) ? $perPage : $default;
    }

    protected function perPageOptions(): array
    {
        return [10, 25, 50];
    }

    protected function searchTerm(Request $request): string
    {
        return trim((string) $request->input('search', ''));
    }

    protected function like(string $search): string
    {
        return '%'.mb_strtolower($search).'%';
    }
}
