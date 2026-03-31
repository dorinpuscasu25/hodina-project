<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Category;
use App\Models\Experience;
use App\Models\Guesthouse;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $recentBookings = Booking::query()
            ->with(['guesthouse', 'guest', 'bookable'])
            ->latest()
            ->take(6)
            ->get()
            ->map(function (Booking $booking): array {
                $bookable = method_exists($booking->bookable, 'toCardArray')
                    ? $booking->bookable->toCardArray('ro')
                    : null;

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->status,
                    'starts_at' => $booking->starts_at?->toIso8601String(),
                    'ends_at' => $booking->ends_at?->toIso8601String(),
                    'guest_name' => $booking->contact_name ?: $booking->guest?->name,
                    'guesthouse_name' => $booking->guesthouse?->translated('name', 'ro'),
                    'bookable_type' => class_basename((string) $booking->bookable_type),
                    'bookable_name' => data_get($bookable, 'title'),
                    'total_amount' => (float) $booking->total_amount,
                    'currency' => $booking->currency,
                ];
            })
            ->values();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                [
                    'label' => 'Pensiuni active',
                    'value' => Guesthouse::query()->where('is_active', true)->count(),
                    'hint' => 'Proprietati publicate si disponibile in sistem.',
                ],
                [
                    'label' => 'Gazde active',
                    'value' => User::query()->where('role', User::ROLE_HOST)->where('is_active', true)->count(),
                    'hint' => 'Conturi de pensiuni care isi pot gestiona calendarul.',
                ],
                [
                    'label' => 'Clienti inregistrati',
                    'value' => User::query()->where('role', User::ROLE_GUEST)->count(),
                    'hint' => 'Vizitatori care pot face rezervari si pot confirma emailul.',
                ],
                [
                    'label' => 'Rezervari pending',
                    'value' => Booking::query()->where('status', Booking::STATUS_PENDING)->count(),
                    'hint' => 'Cereri care asteapta confirmarea pensiunii.',
                ],
            ],
            'bookingStatus' => [
                ['label' => 'Pending', 'value' => Booking::query()->where('status', Booking::STATUS_PENDING)->count()],
                ['label' => 'Confirmed', 'value' => Booking::query()->where('status', Booking::STATUS_CONFIRMED)->count()],
                ['label' => 'Rejected', 'value' => Booking::query()->where('status', Booking::STATUS_REJECTED)->count()],
                ['label' => 'Cancelled', 'value' => Booking::query()->where('status', Booking::STATUS_CANCELLED)->count()],
            ],
            'catalogStats' => [
                ['label' => 'Categorii experiente', 'value' => Category::query()->where('type', Category::TYPE_EXPERIENCE_CATEGORY)->count()],
                ['label' => 'Tipuri cazare', 'value' => Category::query()->where('type', Category::TYPE_ACCOMMODATION_TYPE)->count()],
                ['label' => 'Amenities', 'value' => Category::query()->where('type', Category::TYPE_AMENITY)->count()],
                ['label' => 'Experiente', 'value' => Experience::query()->count()],
                ['label' => 'Cazari', 'value' => Accommodation::query()->count()],
            ],
            'recentBookings' => $recentBookings,
        ]);
    }
}
