<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\CalendarEvent;
use App\Models\Experience;
use App\Models\ExperienceSession;
use App\Models\Guesthouse;
use App\Services\ExperienceScheduleService;
use App\Services\HostAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HostDashboardController extends Controller
{
    public function __construct(
        private readonly ExperienceScheduleService $scheduleService,
        private readonly HostAnalyticsService $analyticsService,
    ) {
    }

    public function summary(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);

        return response()->json([
            'data' => [
                'guesthouse' => $guesthouse->toApiArray($guesthouse->locale),
                ...$this->analyticsService->summary($guesthouse),
                'upcoming_bookings' => Booking::query()
                    ->with(['guest', 'bookable', 'review.guest'])
                    ->where('guesthouse_id', $guesthouse->id)
                    ->whereIn('status', Booking::activeStatuses())
                    ->where('starts_at', '>=', now())
                    ->orderBy('starts_at')
                    ->limit(8)
                    ->get()
                    ->map(fn (Booking $booking) => $booking->toApiArray($guesthouse->locale))
                    ->values(),
            ],
        ]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);

        return response()->json([
            'data' => $this->analyticsService->statistics($guesthouse, $request->only([
                'preset',
                'group_by',
                'start_date',
                'end_date',
            ])),
        ]);
    }

    public function calendar(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $startsAt = $request->date('starts_at')?->startOfDay() ?? now()->startOfMonth();
        $endsAt = $request->date('ends_at')?->endOfDay() ?? now()->addMonth()->endOfMonth();

        $sessions = Experience::query()
            ->where('guesthouse_id', $guesthouse->id)
            ->with(['sessions' => fn ($query) => $query
                ->whereBetween('starts_at', [$startsAt, $endsAt])
                ->with('bookings')
                ->orderBy('starts_at')])
            ->get()
            ->flatMap(fn (Experience $experience) => $experience->sessions->map(
                fn (ExperienceSession $session) => $this->sessionPayload($session->setRelation('experience', $experience), $guesthouse)
            ))
            ->values();

        $bookings = Booking::query()
            ->with(['guest', 'bookable'])
            ->where('guesthouse_id', $guesthouse->id)
            ->whereBetween('starts_at', [$startsAt, $endsAt])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Booking $booking) => $this->bookingPayload($booking, $guesthouse))
            ->values();

        $events = CalendarEvent::query()
            ->with('bookable')
            ->where('guesthouse_id', $guesthouse->id)
            ->whereBetween('starts_at', [$startsAt, $endsAt])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (CalendarEvent $event) => $this->calendarEventPayload($event, $guesthouse))
            ->values();

        return response()->json([
            'data' => [
                'sessions' => $sessions,
                'bookings' => $bookings,
                'events' => $events,
            ],
        ]);
    }

    public function storeCalendarEvent(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);

        $validated = $this->validateCalendarInput($request, true);

        if (! empty($validated['experience_id'])) {
            $experience = Experience::query()
                ->where('guesthouse_id', $guesthouse->id)
                ->findOrFail($validated['experience_id']);

            $session = $this->scheduleService->createManualSession($experience, [
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'],
                'capacity' => $validated['capacity'] ?? $experience->max_guests,
                'title_override' => $validated['title'] ?? null,
                'note' => $validated['description'] ?? null,
            ]);

            return response()->json([
                'data' => $this->sessionPayload($session->fresh('experience', 'bookings'), $guesthouse),
            ], 201);
        }

        $event = $this->fillCalendarEvent(new CalendarEvent(), $validated, $guesthouse);
        $event->save();

        return response()->json([
            'data' => $this->calendarEventPayload($event->fresh('bookable'), $guesthouse),
        ], 201);
    }

    public function updateCalendarEvent(Request $request, CalendarEvent $event): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless((int) $event->guesthouse_id === (int) $guesthouse->id, 404);

        $validated = $this->validateCalendarInput($request, false);

        $this->fillCalendarEvent($event, $validated, $guesthouse)->save();

        return response()->json([
            'data' => $this->calendarEventPayload($event->fresh('bookable'), $guesthouse),
        ]);
    }

    public function destroyCalendarEvent(Request $request, CalendarEvent $event): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        abort_unless((int) $event->guesthouse_id === (int) $guesthouse->id, 404);

        $event->delete();

        return response()->json([
            'message' => 'Evenimentul a fost șters.',
        ]);
    }

    public function updateCalendarSession(Request $request, ExperienceSession $session): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $session->loadMissing('experience', 'bookings');

        abort_unless((int) $session->experience?->guesthouse_id === (int) $guesthouse->id, 404);
        abort_if(! $session->is_manual, 422, 'Sesiunea generată automat se modifică din experiență.');

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:scheduled,blocked,cancelled'],
        ]);

        $session->fill([
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'capacity' => $validated['capacity'] ?? $session->capacity,
            'status' => $validated['status'] ?? $session->status,
            'title_override' => $validated['title'] ?? null,
            'note' => $validated['description'] ?? null,
        ]);
        $session->save();

        return response()->json([
            'data' => $this->sessionPayload($session->fresh('experience', 'bookings'), $guesthouse),
        ]);
    }

    public function destroyCalendarSession(Request $request, ExperienceSession $session): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $session->loadMissing('experience', 'bookings');

        abort_unless((int) $session->experience?->guesthouse_id === (int) $guesthouse->id, 404);
        abort_if(! $session->is_manual, 422, 'Sesiunea generată automat se modifică din experiență.');
        abort_if(
            $session->bookings->whereIn('status', Booking::activeStatuses())->isNotEmpty(),
            422,
            'Sesiunea are rezervări active și nu poate fi ștearsă.'
        );

        $session->delete();

        return response()->json([
            'message' => 'Sesiunea a fost ștearsă.',
        ]);
    }

    private function hostGuesthouse(Request $request)
    {
        $guesthouse = $request->user()->guesthouse;

        abort_unless($guesthouse, 422, 'Host account is not attached to a guesthouse.');

        return $guesthouse;
    }

    private function validateCalendarInput(Request $request, bool $allowExperience): array
    {
        return $request->validate([
            'kind' => ['nullable', 'string', 'in:custom,maintenance,experience'],
            'title' => [$allowExperience ? 'nullable' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'blocks_inventory' => ['nullable', 'boolean'],
            'units_blocked' => ['nullable', 'integer', 'min:0'],
            'accommodation_id' => ['nullable', 'integer', 'exists:accommodations,id'],
            'experience_id' => [$allowExperience ? 'nullable' : 'prohibited', 'integer', 'exists:experiences,id'],
            'capacity' => [$allowExperience ? 'nullable' : 'prohibited', 'integer', 'min:1'],
        ]);
    }

    private function fillCalendarEvent(CalendarEvent $event, array $validated, Guesthouse $guesthouse): CalendarEvent
    {
        $event->fill([
            'kind' => $validated['kind'] ?? CalendarEvent::KIND_CUSTOM,
            'title' => $validated['title'] ?? 'Eveniment',
            'description' => $validated['description'] ?? null,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'blocks_inventory' => (bool) ($validated['blocks_inventory'] ?? false),
            'units_blocked' => (int) ($validated['units_blocked'] ?? 0),
        ]);

        if (! empty($validated['accommodation_id'])) {
            $accommodation = Accommodation::query()
                ->where('guesthouse_id', $guesthouse->id)
                ->findOrFail($validated['accommodation_id']);

            $event->bookable()->associate($accommodation);
        } else {
            $event->bookable()->dissociate();
        }

        $event->guesthouse()->associate($guesthouse);

        return $event;
    }

    private function sessionPayload(ExperienceSession $session, Guesthouse $guesthouse): array
    {
        $activeBookings = $session->relationLoaded('bookings')
            ? $session->bookings->whereIn('status', Booking::activeStatuses())
            : $session->bookings()->whereIn('status', Booking::activeStatuses())->get();

        return [
            'id' => 'session-'.$session->id,
            'entity_id' => $session->id,
            'type' => 'experience_session',
            'title' => $session->title_override ?: $session->experience?->translated('title', $guesthouse->locale),
            'start' => $session->starts_at?->toIso8601String(),
            'end' => $session->ends_at?->toIso8601String(),
            'status' => $session->status,
            'spots_left' => $session->spotsLeft(),
            'capacity' => $session->capacity,
            'reserved_guests' => $session->reserved_guests,
            'experience_id' => $session->experience_id,
            'experience_title' => $session->experience?->translated('title', $guesthouse->locale),
            'description' => $session->note,
            'title_override' => $session->title_override,
            'is_manual' => $session->is_manual,
            'editable' => $session->is_manual,
            'deletable' => $session->is_manual && $activeBookings->isEmpty(),
        ];
    }

    private function bookingPayload(Booking $booking, Guesthouse $guesthouse): array
    {
        return [
            'id' => 'booking-'.$booking->id,
            'entity_id' => $booking->id,
            'type' => 'booking',
            'title' => $booking->contact_name.' - '.$booking->booking_number,
            'start' => $booking->starts_at?->toIso8601String(),
            'end' => $booking->ends_at?->toIso8601String(),
            'status' => $booking->status,
            'contact_name' => $booking->contact_name,
            'booking_number' => $booking->booking_number,
            'chat_enabled' => $booking->isChatEnabled(),
            'bookable' => $booking->bookable?->toCardArray($guesthouse->locale),
        ];
    }

    private function calendarEventPayload(CalendarEvent $event, Guesthouse $guesthouse): array
    {
        return [
            'id' => 'calendar-'.$event->id,
            'entity_id' => $event->id,
            'type' => $event->kind,
            'title' => $event->title,
            'description' => $event->description,
            'start' => $event->starts_at?->toIso8601String(),
            'end' => $event->ends_at?->toIso8601String(),
            'blocks_inventory' => $event->blocks_inventory,
            'units_blocked' => $event->units_blocked,
            'accommodation_id' => $event->bookable_type === Accommodation::class ? $event->bookable_id : null,
            'accommodation_title' => $event->bookable_type === Accommodation::class
                ? $event->bookable?->translated('title', $guesthouse->locale)
                : null,
            'editable' => true,
            'deletable' => true,
        ];
    }
}
