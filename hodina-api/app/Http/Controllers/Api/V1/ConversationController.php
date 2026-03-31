<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function indexForGuest(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guest_user_id === $request->user()->id, 404);
        abort_unless($booking->isChatEnabled(), 403, 'Chat becomes available after booking confirmation.');

        $booking->load(['conversation.messages.sender']);
        $conversation = $booking->conversation()->firstOrCreate(['booking_id' => $booking->id], ['opened_at' => now()]);

        return response()->json([
            'data' => $conversation->messages()->orderBy('created_at')->get()->map->toApiArray()->values(),
        ]);
    }

    public function storeForGuest(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guest_user_id === $request->user()->id, 404);

        return $this->store($request, $booking);
    }

    public function indexForHost(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guesthouse_id === $request->user()->guesthouse_id, 404);
        abort_unless($booking->isChatEnabled(), 403, 'Chat becomes available after booking confirmation.');

        $booking->load(['conversation.messages.sender']);
        $conversation = $booking->conversation()->firstOrCreate(['booking_id' => $booking->id], ['opened_at' => now()]);

        return response()->json([
            'data' => $conversation->messages()->orderBy('created_at')->get()->map->toApiArray()->values(),
        ]);
    }

    public function storeForHost(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guesthouse_id === $request->user()->guesthouse_id, 404);

        return $this->store($request, $booking);
    }

    private function store(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->isChatEnabled(), 403, 'Chat becomes available after booking confirmation.');

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:3000'],
        ]);

        $conversation = $booking->conversation()->firstOrCreate(['booking_id' => $booking->id], ['opened_at' => now()]);
        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        return response()->json([
            'data' => $message->fresh('sender')->toApiArray(),
        ], 201);
    }
}
