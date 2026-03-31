<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Experience;
use App\Models\ExperienceSession;
use Carbon\Carbon;

class ExperienceScheduleService
{
    public function syncRecurringSessions(Experience $experience): void
    {
        $experience->loadMissing('recurrences', 'sessions.bookings');

        $experience->sessions
            ->filter(fn (ExperienceSession $session) => ! $session->is_manual && $session->starts_at?->isFuture())
            ->each(function (ExperienceSession $session): void {
                if (! $session->bookings()->whereIn('status', Booking::activeStatuses())->exists()) {
                    $session->delete();
                }
            });

        $startDate = now()->startOfDay();
        $endDate = now()->addDays((int) config('hodina.session_generation_days', 90))->endOfDay();

        foreach ($experience->recurrences()->where('is_active', true)->get() as $recurrence) {
            $cursor = $startDate->copy();

            while ($cursor->lte($endDate)) {
                if ($cursor->dayOfWeekIso === (int) $recurrence->weekday) {
                    $startsAt = Carbon::parse($cursor->format('Y-m-d').' '.$recurrence->start_time);
                    $endsAt = Carbon::parse($cursor->format('Y-m-d').' '.$recurrence->end_time);

                    if ($endsAt->lte($startsAt)) {
                        $endsAt->addDay();
                    }

                    if ($endsAt->isFuture()) {
                        ExperienceSession::updateOrCreate(
                            [
                                'experience_id' => $experience->id,
                                'starts_at' => $startsAt,
                            ],
                            [
                                'experience_recurrence_id' => $recurrence->id,
                                'ends_at' => $endsAt,
                                'capacity' => $recurrence->capacity,
                                'status' => ExperienceSession::STATUS_SCHEDULED,
                                'is_manual' => false,
                            ]
                        );
                    }
                }

                $cursor->addDay();
            }
        }
    }

    public function createManualSession(Experience $experience, array $payload): ExperienceSession
    {
        return $experience->sessions()->create([
            'starts_at' => $payload['starts_at'],
            'ends_at' => $payload['ends_at'],
            'capacity' => $payload['capacity'] ?? $experience->max_guests,
            'status' => ExperienceSession::STATUS_SCHEDULED,
            'is_manual' => true,
            'title_override' => $payload['title_override'] ?? null,
            'note' => $payload['note'] ?? null,
        ]);
    }
}
