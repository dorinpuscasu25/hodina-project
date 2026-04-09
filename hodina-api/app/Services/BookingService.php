<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\ExperienceSession;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function createExperienceBooking(ExperienceSession $session, User $guest, array $payload): Booking
    {
        return DB::transaction(function () use ($session, $guest, $payload) {
            $session = ExperienceSession::query()
                ->with('experience.guesthouse')
                ->lockForUpdate()
                ->findOrFail($session->id);

            $partySize = max(1, (int) $payload['adults'] + (int) $payload['children']);

            if ($session->status !== ExperienceSession::STATUS_SCHEDULED) {
                throw ValidationException::withMessages([
                    'session' => 'This experience session is not available anymore.',
                ]);
            }

            if ($session->reserved_guests + $partySize > $session->capacity) {
                throw ValidationException::withMessages([
                    'session' => 'There are not enough places left for this experience.',
                ]);
            }

            $experience = $session->experience;
            $status = $experience->is_instant_book ? Booking::STATUS_CONFIRMED : Booking::STATUS_PENDING;
            $subtotal = $experience->price_mode === 'per_group'
                ? (float) $experience->price_amount
                : (float) $experience->price_amount * $partySize;

            $booking = Booking::create([
                'guesthouse_id' => $experience->guesthouse_id,
                'guest_user_id' => $guest->id,
                'experience_session_id' => $session->id,
                'bookable_type' => $experience::class,
                'bookable_id' => $experience->id,
                'status' => $status,
                'starts_at' => $session->starts_at,
                'ends_at' => $session->ends_at,
                'adults' => (int) $payload['adults'],
                'children' => (int) $payload['children'],
                'infants' => (int) $payload['infants'],
                'units' => 1,
                'currency' => $experience->currency,
                'subtotal_amount' => $subtotal,
                'total_amount' => $subtotal,
                'payment_status' => $status === Booking::STATUS_CONFIRMED ? Booking::PAYMENT_PAID : Booking::PAYMENT_PENDING,
                'paid_amount' => $status === Booking::STATUS_CONFIRMED ? $subtotal : 0,
                'contact_name' => $payload['contact_name'],
                'contact_email' => $payload['contact_email'],
                'contact_phone' => $payload['contact_phone'] ?? null,
                'special_requests' => $payload['special_requests'] ?? null,
                'paid_at' => $status === Booking::STATUS_CONFIRMED ? now() : null,
                'confirmed_at' => $status === Booking::STATUS_CONFIRMED ? now() : null,
            ]);

            $session->increment('reserved_guests', $partySize);

            if ($booking->isChatEnabled()) {
                $booking->conversation()->firstOrCreate(
                    ['booking_id' => $booking->id],
                    ['opened_at' => now()]
                );
            }

            return $booking->fresh(['guesthouse', 'guest', 'bookable', 'experienceSession', 'review']);
        });
    }

    public function createAccommodationBooking(Accommodation $accommodation, User $guest, array $payload): Booking
    {
        return DB::transaction(function () use ($accommodation, $guest, $payload) {
            $accommodation = Accommodation::query()
                ->with('guesthouse')
                ->lockForUpdate()
                ->findOrFail($accommodation->id);

            $startsAt = Carbon::parse($payload['starts_at'])->startOfDay();
            $endsAt = Carbon::parse($payload['ends_at'])->startOfDay();
            $units = max(1, (int) ($payload['units'] ?? 1));
            $nights = max($startsAt->diffInDays($endsAt), 1);

            if ($startsAt->gte($endsAt)) {
                throw ValidationException::withMessages([
                    'ends_at' => 'Check-out must be after check-in.',
                ]);
            }

            if ($accommodation->availableUnitsBetween($startsAt, $endsAt) < $units) {
                throw ValidationException::withMessages([
                    'units' => 'There are not enough available accommodation units for this period.',
                ]);
            }

            $subtotal = ((float) $accommodation->nightly_rate * $nights * $units) + (float) $accommodation->cleaning_fee;
            $status = $accommodation->is_instant_book ? Booking::STATUS_CONFIRMED : Booking::STATUS_PENDING;

            $booking = Booking::create([
                'guesthouse_id' => $accommodation->guesthouse_id,
                'guest_user_id' => $guest->id,
                'bookable_type' => $accommodation::class,
                'bookable_id' => $accommodation->id,
                'status' => $status,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'adults' => (int) $payload['adults'],
                'children' => (int) $payload['children'],
                'infants' => (int) $payload['infants'],
                'units' => $units,
                'currency' => $accommodation->currency,
                'subtotal_amount' => $subtotal,
                'total_amount' => $subtotal,
                'payment_status' => $status === Booking::STATUS_CONFIRMED ? Booking::PAYMENT_PAID : Booking::PAYMENT_PENDING,
                'paid_amount' => $status === Booking::STATUS_CONFIRMED ? $subtotal : 0,
                'contact_name' => $payload['contact_name'],
                'contact_email' => $payload['contact_email'],
                'contact_phone' => $payload['contact_phone'] ?? null,
                'special_requests' => $payload['special_requests'] ?? null,
                'paid_at' => $status === Booking::STATUS_CONFIRMED ? now() : null,
                'confirmed_at' => $status === Booking::STATUS_CONFIRMED ? now() : null,
            ]);

            if ($booking->isChatEnabled()) {
                $booking->conversation()->firstOrCreate(
                    ['booking_id' => $booking->id],
                    ['opened_at' => now()]
                );
            }

            return $booking->fresh(['guesthouse', 'guest', 'bookable', 'review']);
        });
    }

    public function confirm(Booking $booking, ?string $hostResponse = null): Booking
    {
        return DB::transaction(function () use ($booking, $hostResponse) {
            $booking = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            if ($booking->status !== Booking::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'booking' => 'Only pending bookings can be confirmed.',
                ]);
            }

            $booking->update([
                'status' => Booking::STATUS_CONFIRMED,
                'host_response' => $hostResponse,
                'payment_status' => Booking::PAYMENT_PAID,
                'paid_amount' => $booking->total_amount,
                'paid_at' => now(),
                'refunded_amount' => 0,
                'refunded_at' => null,
                'confirmed_at' => now(),
                'rejected_at' => null,
            ]);

            $booking->conversation()->firstOrCreate(
                ['booking_id' => $booking->id],
                ['opened_at' => now()]
            );

            return $booking->fresh(['guesthouse', 'guest', 'bookable', 'experienceSession', 'review']);
        });
    }

    public function reject(Booking $booking, ?string $hostResponse = null): Booking
    {
        return DB::transaction(function () use ($booking, $hostResponse) {
            $booking = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            if (! in_array($booking->status, Booking::activeStatuses(), true)) {
                throw ValidationException::withMessages([
                    'booking' => 'Only active bookings can be rejected.',
                ]);
            }

            $this->releaseExperienceSpots($booking);

            $booking->update([
                'status' => Booking::STATUS_REJECTED,
                'host_response' => $hostResponse,
                'payment_status' => $booking->paid_amount > 0 ? Booking::PAYMENT_REFUNDED : Booking::PAYMENT_PENDING,
                'refunded_amount' => $booking->paid_amount,
                'refunded_at' => $booking->paid_amount > 0 ? now() : null,
                'rejected_at' => now(),
            ]);

            return $booking->fresh(['guesthouse', 'guest', 'bookable', 'experienceSession', 'review']);
        });
    }

    public function cancel(Booking $booking, ?string $message = null): Booking
    {
        return DB::transaction(function () use ($booking, $message) {
            $booking = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            if (! in_array($booking->status, Booking::activeStatuses(), true)) {
                throw ValidationException::withMessages([
                    'booking' => 'Only active bookings can be cancelled.',
                ]);
            }

            $this->releaseExperienceSpots($booking);

            $booking->update([
                'status' => Booking::STATUS_CANCELLED,
                'host_response' => $message,
                'payment_status' => $booking->paid_amount > 0 ? Booking::PAYMENT_REFUNDED : Booking::PAYMENT_PENDING,
                'refunded_amount' => $booking->paid_amount,
                'refunded_at' => $booking->paid_amount > 0 ? now() : null,
                'cancelled_at' => now(),
            ]);

            return $booking->fresh(['guesthouse', 'guest', 'bookable', 'experienceSession', 'review']);
        });
    }

    private function releaseExperienceSpots(Booking $booking): void
    {
        if (! $booking->experience_session_id) {
            return;
        }

        $session = ExperienceSession::query()->lockForUpdate()->find($booking->experience_session_id);

        if ($session) {
            $session->update([
                'reserved_guests' => max($session->reserved_guests - $booking->partySize(), 0),
            ]);
        }
    }
}
