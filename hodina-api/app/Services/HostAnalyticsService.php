<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Experience;
use App\Models\Guesthouse;
use App\Models\Review;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class HostAnalyticsService
{
    public function summary(Guesthouse $guesthouse): array
    {
        $currentMonth = $this->statistics($guesthouse, [
            'preset' => 'month',
            'group_by' => 'day',
        ]);

        $recentReviews = Review::query()
            ->with('guest')
            ->where('guesthouse_id', $guesthouse->id)
            ->latest('published_at')
            ->limit(5)
            ->get();

        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        return [
            'counts' => [
                'experiences' => Experience::query()->where('guesthouse_id', $guesthouse->id)->count(),
                'accommodations' => Accommodation::query()->where('guesthouse_id', $guesthouse->id)->count(),
                'pending_bookings' => Booking::query()->where('guesthouse_id', $guesthouse->id)->where('status', Booking::STATUS_PENDING)->count(),
                'confirmed_bookings' => Booking::query()->where('guesthouse_id', $guesthouse->id)->where('status', Booking::STATUS_CONFIRMED)->count(),
            ],
            'financials' => [
                'gross_revenue' => (float) Booking::query()
                    ->where('guesthouse_id', $guesthouse->id)
                    ->whereNotIn('status', [Booking::STATUS_REJECTED, Booking::STATUS_CANCELLED])
                    ->sum('total_amount'),
                'paid_revenue' => (float) Booking::query()->where('guesthouse_id', $guesthouse->id)->sum('paid_amount'),
                'refunded_amount' => (float) Booking::query()->where('guesthouse_id', $guesthouse->id)->sum('refunded_amount'),
                'outstanding_amount' => (float) Booking::query()
                    ->where('guesthouse_id', $guesthouse->id)
                    ->whereIn('status', [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED])
                    ->selectRaw('COALESCE(SUM(total_amount - paid_amount), 0) as total')
                    ->value('total'),
            ],
            'highlights' => [
                'today_check_ins' => Booking::query()
                    ->where('guesthouse_id', $guesthouse->id)
                    ->whereBetween('starts_at', [$todayStart, $todayEnd])
                    ->whereIn('status', [Booking::STATUS_CONFIRMED, Booking::STATUS_COMPLETED])
                    ->count(),
                'today_check_outs' => Booking::query()
                    ->where('guesthouse_id', $guesthouse->id)
                    ->whereBetween('ends_at', [$todayStart, $todayEnd])
                    ->whereIn('status', [Booking::STATUS_CONFIRMED, Booking::STATUS_COMPLETED])
                    ->count(),
                'unique_clients' => Booking::query()
                    ->where('guesthouse_id', $guesthouse->id)
                    ->distinct('guest_user_id')
                    ->count('guest_user_id'),
                'average_rating' => round((float) Review::query()->where('guesthouse_id', $guesthouse->id)->avg('rating'), 2),
                'reviews_count' => Review::query()->where('guesthouse_id', $guesthouse->id)->count(),
            ],
            'statistics_preview' => [
                'period' => $currentMonth['period'],
                'overview' => $currentMonth['overview'],
                'trend' => collect($currentMonth['trend'])->take(-14)->values(),
                'booking_statuses' => $currentMonth['booking_statuses'],
                'top_listings' => collect($currentMonth['top_listings'])->take(4)->values(),
            ],
            'recent_reviews' => $recentReviews->map(fn (Review $review) => $review->toApiArray())->values(),
        ];
    }

    public function statistics(Guesthouse $guesthouse, array $filters = []): array
    {
        $period = $this->resolvePeriod($filters);

        $bookings = Booking::query()
            ->with(['bookable', 'review.guest'])
            ->where('guesthouse_id', $guesthouse->id)
            ->whereBetween('created_at', [$period['start'], $period['end']])
            ->get();

        $reviews = Review::query()
            ->with('guest')
            ->where('guesthouse_id', $guesthouse->id)
            ->whereBetween('created_at', [$period['start'], $period['end']])
            ->latest('published_at')
            ->get();

        return [
            'period' => [
                'preset' => $period['preset'],
                'group_by' => $period['group_by'],
                'start_date' => $period['start']->toDateString(),
                'end_date' => $period['end']->toDateString(),
                'label' => $this->periodLabel($period),
            ],
            'overview' => $this->overview($bookings, $reviews),
            'trend' => $this->trend($period, $bookings),
            'booking_statuses' => $this->statusBreakdown($bookings),
            'bookable_types' => $this->bookableTypeBreakdown($bookings),
            'top_listings' => $this->topListings($bookings, $guesthouse->locale),
            'recent_reviews' => $reviews->take(8)->map(fn (Review $review) => $review->toApiArray())->values(),
        ];
    }

    private function resolvePeriod(array $filters): array
    {
        $preset = (string) ($filters['preset'] ?? '30d');
        $today = CarbonImmutable::now();

        $period = match ($preset) {
            'today' => [
                'start' => $today->startOfDay(),
                'end' => $today->endOfDay(),
            ],
            '7d' => [
                'start' => $today->subDays(6)->startOfDay(),
                'end' => $today->endOfDay(),
            ],
            'month' => [
                'start' => $today->startOfMonth(),
                'end' => $today->endOfMonth(),
            ],
            'custom' => [
                'start' => CarbonImmutable::parse((string) ($filters['start_date'] ?? $today->startOfMonth()->toDateString()))->startOfDay(),
                'end' => CarbonImmutable::parse((string) ($filters['end_date'] ?? $today->toDateString()))->endOfDay(),
            ],
            default => [
                'start' => $today->subDays(29)->startOfDay(),
                'end' => $today->endOfDay(),
            ],
        };

        $days = max($period['start']->diffInDays($period['end']) + 1, 1);
        $groupBy = (string) ($filters['group_by'] ?? ($days > 92 ? 'month' : ($days > 31 ? 'week' : 'day')));

        return [
            'preset' => $preset,
            'group_by' => in_array($groupBy, ['day', 'week', 'month'], true) ? $groupBy : 'day',
            'start' => $period['start'],
            'end' => $period['end'],
        ];
    }

    private function overview(Collection $bookings, Collection $reviews): array
    {
        $nonCancelled = $bookings->reject(
            fn (Booking $booking) => in_array($booking->status, [Booking::STATUS_REJECTED, Booking::STATUS_CANCELLED], true)
        );
        $completedStays = $bookings->filter(
            fn (Booking $booking) => $booking->isReviewEligible() || $booking->status === Booking::STATUS_COMPLETED
        );
        $confirmedOrCompleted = $bookings->filter(
            fn (Booking $booking) => in_array($booking->status, [Booking::STATUS_CONFIRMED, Booking::STATUS_COMPLETED], true)
        );
        $grossRevenue = $nonCancelled->sum(fn (Booking $booking) => (float) $booking->total_amount);
        $paidRevenue = $bookings->sum(fn (Booking $booking) => (float) $booking->paid_amount);
        $refundedAmount = $bookings->sum(fn (Booking $booking) => (float) $booking->refunded_amount);

        return [
            'bookings_total' => $bookings->count(),
            'confirmed_bookings' => $bookings->where('status', Booking::STATUS_CONFIRMED)->count(),
            'pending_bookings' => $bookings->where('status', Booking::STATUS_PENDING)->count(),
            'cancelled_bookings' => $bookings->whereIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_REJECTED])->count(),
            'completed_stays' => $completedStays->count(),
            'guests_total' => $bookings->sum(fn (Booking $booking) => $booking->adults + $booking->children + $booking->infants),
            'unique_clients' => $bookings->pluck('guest_user_id')->filter()->unique()->count(),
            'gross_revenue' => round($grossRevenue, 2),
            'paid_revenue' => round($paidRevenue, 2),
            'refunded_amount' => round($refundedAmount, 2),
            'outstanding_amount' => round(max($grossRevenue - $paidRevenue, 0), 2),
            'average_booking_value' => round($bookings->count() > 0 ? $grossRevenue / $bookings->count() : 0, 2),
            'reviews_count' => $reviews->count(),
            'average_rating' => round((float) $reviews->avg('rating'), 2),
            'confirmation_rate' => round($bookings->count() > 0 ? ($confirmedOrCompleted->count() / $bookings->count()) * 100 : 0, 1),
        ];
    }

    private function trend(array $period, Collection $bookings): Collection
    {
        $buckets = collect();
        $cursor = $period['start'];

        while ($cursor <= $period['end']) {
            [$bucketStart, $bucketEnd, $label] = match ($period['group_by']) {
                'month' => [$cursor->startOfMonth(), $cursor->endOfMonth(), $cursor->translatedFormat('M Y')],
                'week' => [$cursor->startOfWeek(), $cursor->endOfWeek(), $cursor->startOfWeek()->format('d M')],
                default => [$cursor->startOfDay(), $cursor->endOfDay(), $cursor->format('d M')],
            };

            if (! $buckets->contains(fn (array $item) => $item['start'] === $bucketStart->toDateString())) {
                $bucketBookings = $bookings->filter(fn (Booking $booking) => $booking->created_at?->between($bucketStart, $bucketEnd));

                $buckets->push([
                    'start' => $bucketStart->toDateString(),
                    'end' => $bucketEnd->toDateString(),
                    'label' => $label,
                    'bookings' => $bucketBookings->count(),
                    'guests' => $bucketBookings->sum(fn (Booking $booking) => $booking->adults + $booking->children + $booking->infants),
                    'gross_revenue' => round($bucketBookings->sum(fn (Booking $booking) => (float) $booking->total_amount), 2),
                    'paid_revenue' => round($bucketBookings->sum(fn (Booking $booking) => (float) $booking->paid_amount), 2),
                ]);
            }

            $cursor = match ($period['group_by']) {
                'month' => $cursor->addMonth()->startOfMonth(),
                'week' => $cursor->addWeek()->startOfWeek(),
                default => $cursor->addDay()->startOfDay(),
            };
        }

        return $buckets->values();
    }

    private function statusBreakdown(Collection $bookings): Collection
    {
        $labels = [
            Booking::STATUS_PENDING => 'Pending',
            Booking::STATUS_CONFIRMED => 'Confirmate',
            Booking::STATUS_COMPLETED => 'Finalizate',
            Booking::STATUS_CANCELLED => 'Anulate',
            Booking::STATUS_REJECTED => 'Respinse',
        ];

        return collect($labels)->map(
            fn (string $label, string $status) => [
                'status' => $status,
                'label' => $label,
                'value' => $bookings->where('status', $status)->count(),
            ]
        )->values();
    }

    private function bookableTypeBreakdown(Collection $bookings): Collection
    {
        return collect([
            ['key' => Experience::class, 'label' => 'Experiențe'],
            ['key' => Accommodation::class, 'label' => 'Cazări'],
        ])->map(function (array $item) use ($bookings) {
            $subset = $bookings->where('bookable_type', $item['key']);

            return [
                'type' => class_basename($item['key']),
                'label' => $item['label'],
                'value' => $subset->count(),
                'gross_revenue' => round($subset->sum(fn (Booking $booking) => (float) $booking->total_amount), 2),
                'paid_revenue' => round($subset->sum(fn (Booking $booking) => (float) $booking->paid_amount), 2),
            ];
        })->values();
    }

    private function topListings(Collection $bookings, ?string $locale = null): Collection
    {
        return $bookings
            ->filter(fn (Booking $booking) => $booking->bookable !== null)
            ->groupBy(fn (Booking $booking) => sprintf('%s:%s', $booking->bookable_type, $booking->bookable_id))
            ->map(function (Collection $group) use ($locale) {
                /** @var Booking $first */
                $first = $group->first();
                $ratings = $group->pluck('review.rating')->filter();
                $bookablePayload = method_exists($first->bookable, 'toCardArray')
                    ? $first->bookable->toCardArray($locale)
                    : null;

                return [
                    'id' => $first->bookable_id,
                    'type' => class_basename((string) $first->bookable_type),
                    'title' => data_get($bookablePayload, 'title'),
                    'cover_image' => data_get($bookablePayload, 'cover_image'),
                    'bookings' => $group->count(),
                    'gross_revenue' => round($group->sum(fn (Booking $booking) => (float) $booking->total_amount), 2),
                    'paid_revenue' => round($group->sum(fn (Booking $booking) => (float) $booking->paid_amount), 2),
                    'reviews_count' => $ratings->count(),
                    'average_rating' => round((float) $ratings->avg(), 2),
                ];
            })
            ->sortByDesc('gross_revenue')
            ->take(6)
            ->values();
    }

    private function periodLabel(array $period): string
    {
        return sprintf(
            '%s - %s',
            $period['start']->format('d M Y'),
            $period['end']->format('d M Y'),
        );
    }
}
