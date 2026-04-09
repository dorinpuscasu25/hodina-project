<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\ExperienceSession;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $bookings = $request->user()
            ->guestBookings()
            ->with(['guesthouse', 'experienceSession', 'bookable', 'review.guest'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->get();

        return response()->json([
            'data' => $bookings->map(fn (Booking $booking) => $booking->toApiArray($request->user()->locale))->values(),
        ]);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guest_user_id === $request->user()->id, 404);

        $booking->load(['guesthouse', 'experienceSession', 'bookable', 'conversation.messages.sender', 'review.guest']);

        return response()->json([
            'data' => $booking->toApiArray($request->user()->locale),
        ]);
    }

    public function storeExperienceBooking(Request $request, ExperienceSession $session): JsonResponse
    {
        $validated = $request->validate([
            'adults' => ['required', 'integer', 'min:1'],
            'children' => ['nullable', 'integer', 'min:0'],
            'infants' => ['nullable', 'integer', 'min:0'],
            'contact_name' => ['required', 'string', 'max:255'],
            'contact_email' => ['required', 'string', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'special_requests' => ['nullable', 'string'],
        ]);

        $booking = $this->bookingService->createExperienceBooking($session, $request->user(), array_merge([
            'children' => 0,
            'infants' => 0,
        ], $validated));

        return response()->json([
            'data' => $booking->toApiArray($request->user()->locale),
        ], 201);
    }

    public function storeAccommodationBooking(Request $request, Accommodation $accommodation): JsonResponse
    {
        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'adults' => ['required', 'integer', 'min:1'],
            'children' => ['nullable', 'integer', 'min:0'],
            'infants' => ['nullable', 'integer', 'min:0'],
            'units' => ['nullable', 'integer', 'min:1'],
            'contact_name' => ['required', 'string', 'max:255'],
            'contact_email' => ['required', 'string', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'special_requests' => ['nullable', 'string'],
        ]);

        $booking = $this->bookingService->createAccommodationBooking($accommodation, $request->user(), array_merge([
            'children' => 0,
            'infants' => 0,
            'units' => 1,
        ], $validated));

        return response()->json([
            'data' => $booking->toApiArray($request->user()->locale),
        ], 201);
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->guest_user_id === $request->user()->id, 404);

        $booking = $this->bookingService->cancel($booking, 'Cancelled by guest');

        return response()->json([
            'data' => $booking->toApiArray($request->user()->locale),
        ]);
    }
}
