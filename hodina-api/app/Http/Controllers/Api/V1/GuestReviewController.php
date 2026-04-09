<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestReviewController extends Controller
{
    public function storeOrUpdate(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guest_user_id === $request->user()->id, 404);
        abort_unless($booking->isReviewEligible(), 422, 'Poți lăsa review doar după finalizarea sejurului sau experienței.');

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'comment' => ['required', 'string', 'min:20', 'max:5000'],
        ]);

        $review = $booking->review()->updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'guesthouse_id' => $booking->guesthouse_id,
                'guest_user_id' => $request->user()->id,
                'reviewable_type' => $booking->bookable_type,
                'reviewable_id' => $booking->bookable_id,
                'rating' => $validated['rating'],
                'title' => $validated['title'] ?? null,
                'comment' => $validated['comment'],
                'published_at' => now(),
            ],
        );

        return response()->json([
            'data' => $review->fresh('guest')->toApiArray(),
        ]);
    }
}
