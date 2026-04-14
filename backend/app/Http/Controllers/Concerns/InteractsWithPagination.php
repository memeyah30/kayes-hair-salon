<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait InteractsWithPagination
{
    protected function shouldPaginate(Request $request): bool
    {
        return $request->boolean('paginate')
            || $request->has('page')
            || $request->has('per_page');
    }

    protected function resolvePerPage(Request $request, int $default = 10, int $max = 100): int
    {
        $requested = (int) $request->integer('per_page', $default);

        if ($requested <= 0) {
            return $default;
        }

        return min($requested, $max);
    }
}
