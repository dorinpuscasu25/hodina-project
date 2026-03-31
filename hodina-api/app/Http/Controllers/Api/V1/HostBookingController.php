<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HostBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);

        $bookings = Booking::query()
            ->with(['guesthouse', 'guest', 'bookable', 'experienceSession'])
            ->where('guesthouse_id', $guesthouse->id)
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->get();

        return response()->json([
            'data' => $bookings->map(fn (Booking $booking) => $booking->toApiArray($guesthouse->locale))->values(),
        ]);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($booking->guesthouse_id === $guesthouse->id, 404);

        $booking->load(['guesthouse', 'guest', 'bookable', 'experienceSession', 'conversation.messages.sender']);

        return response()->json([
            'data' => $booking->toApiArray($guesthouse->locale),
        ]);
    }

    public function confirm(Request $request, Booking $booking): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($booking->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'host_response' => ['nullable', 'string'],
        ]);

        $booking = $this->bookingService->confirm($booking, $validated['host_response'] ?? null);

        return response()->json([
            'data' => $booking->toApiArray($guesthouse->locale),
        ]);
    }

    public function reject(Request $request, Booking $booking): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($booking->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'host_response' => ['nullable', 'string'],
        ]);

        $booking = $this->bookingService->reject($booking, $validated['host_response'] ?? null);

        return response()->json([
            'data' => $booking->toApiArray($guesthouse->locale),
        ]);
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless($booking->guesthouse_id === $guesthouse->id, 404);

        $validated = $request->validate([
            'host_response' => ['nullable', 'string'],
        ]);

        $booking = $this->bookingService->cancel($booking, $validated['host_response'] ?? 'Cancelled by host');

        return response()->json([
            'data' => $booking->toApiArray($guesthouse->locale),
        ]);
    }

    private function hostGuesthouse(Request $request)
    {
        $guesthouse = $request->user()->guesthouse;

        abort_unless($guesthouse, 422, 'Host account is not attached to a guesthouse.');

        return $guesthouse;
    }
}
