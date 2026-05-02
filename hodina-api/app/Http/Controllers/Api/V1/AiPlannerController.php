<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AiPlannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AiPlannerController extends Controller
{
    public function __construct(private readonly AiPlannerService $planner)
    {
    }

    public function plan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'min:2', 'max:2000'],
            'history' => ['sometimes', 'array', 'max:20'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:2000'],
            'locale' => ['sometimes', 'string', 'in:ro,ru,en'],
        ]);

        $rateKey = 'ai-plan:'.($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($rateKey, 20)) {
            return response()->json([
                'message' => 'Too many requests. Please slow down.',
            ], 429);
        }
        RateLimiter::hit($rateKey, 60);

        $result = $this->planner->plan(
            (string) $validated['prompt'],
            (array) ($validated['history'] ?? []),
            (string) ($validated['locale'] ?? 'ro')
        );

        return response()->json([
            'data' => [
                'reply' => $result['reply'],
                'suggestions' => $result['suggestions'],
            ],
        ]);
    }
}
