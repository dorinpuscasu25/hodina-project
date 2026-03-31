<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Experience;
use App\Models\Guesthouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuesthouseController extends Controller
{
    public function show(Request $request, string $guesthouse): JsonResponse
    {
        $locale = $request->string('locale')->toString() ?: app()->getLocale();

        $guesthouseModel = Guesthouse::query()
            ->where('is_active', true)
            ->where(function ($query) use ($guesthouse) {
                $query->where('slug', $guesthouse);

                if (is_numeric($guesthouse)) {
                    $query->orWhere('id', (int) $guesthouse);
                }
            })
            ->firstOrFail();

        $experiences = Experience::query()
            ->with(['guesthouse', 'category', 'amenities'])
            ->published()
            ->where('guesthouse_id', $guesthouseModel->id)
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Experience $experience) => $experience->toCardArray($locale))
            ->values();

        $accommodations = Accommodation::query()
            ->with(['guesthouse', 'type', 'amenities'])
            ->published()
            ->where('guesthouse_id', $guesthouseModel->id)
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Accommodation $accommodation) => $accommodation->toCardArray($locale))
            ->values();

        return response()->json([
            'data' => [
                'guesthouse' => $guesthouseModel->toApiArray($locale),
                'counts' => [
                    'experiences' => Experience::query()
                        ->published()
                        ->where('guesthouse_id', $guesthouseModel->id)
                        ->count(),
                    'accommodations' => Accommodation::query()
                        ->published()
                        ->where('guesthouse_id', $guesthouseModel->id)
                        ->count(),
                ],
                'experiences' => $experiences,
                'accommodations' => $accommodations,
            ],
        ]);
    }
}
