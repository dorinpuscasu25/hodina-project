<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\InteractsWithAdminTables;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    use InteractsWithAdminTables;

    public function index(Request $request): Response
    {
        $allowedStatuses = [
            Booking::STATUS_PENDING,
            Booking::STATUS_CONFIRMED,
            Booking::STATUS_REJECTED,
            Booking::STATUS_CANCELLED,
            Booking::STATUS_COMPLETED,
        ];

        $status = $request->string('status')->toString();
        $search = $this->searchTerm($request);
        $perPage = $this->perPage($request);
        $like = $this->like($search);

        if (! in_array($status, $allowedStatuses, true)) {
            $status = '';
        }

        $bookings = Booking::query()
            ->with(['guesthouse', 'guest', 'bookable'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($search, function ($query) use ($like) {
                $query->where(function ($nestedQuery) use ($like) {
                    $nestedQuery
                        ->whereRaw('LOWER(booking_number) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(contact_name, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(contact_email, \'\')) LIKE ?', [$like])
                        ->orWhereHas('guest', function ($guestQuery) use ($like) {
                            $guestQuery
                                ->whereRaw('LOWER(name) LIKE ?', [$like])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                        })
                        ->orWhereHas('guesthouse', fn ($guesthouseQuery) => $guesthouseQuery->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$like]));
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Booking $booking): array {
                $bookable = method_exists($booking->bookable, 'toCardArray')
                    ? $booking->bookable->toCardArray('ro')
                    : null;

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->status,
                    'bookable_type' => class_basename((string) $booking->bookable_type),
                    'bookable_name' => data_get($bookable, 'title'),
                    'guesthouse_name' => $booking->guesthouse?->translated('name', 'ro'),
                    'guest_name' => $booking->contact_name ?: $booking->guest?->name,
                    'guest_email' => $booking->contact_email ?: $booking->guest?->email,
                    'starts_at' => $booking->starts_at?->toIso8601String(),
                    'ends_at' => $booking->ends_at?->toIso8601String(),
                    'adults' => $booking->adults,
                    'children' => $booking->children,
                    'units' => $booking->units,
                    'total_amount' => (float) $booking->total_amount,
                    'currency' => $booking->currency,
                    'special_requests' => $booking->special_requests,
                    'host_response' => $booking->host_response,
                    'chat_enabled' => $booking->isChatEnabled(),
                    'created_at' => $booking->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('admin/bookings/index', [
            'bookings' => $bookings,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'statusOptions' => [
                ['value' => '', 'label' => 'All'],
                ['value' => Booking::STATUS_PENDING, 'label' => 'Pending'],
                ['value' => Booking::STATUS_CONFIRMED, 'label' => 'Confirmed'],
                ['value' => Booking::STATUS_REJECTED, 'label' => 'Rejected'],
                ['value' => Booking::STATUS_CANCELLED, 'label' => 'Cancelled'],
                ['value' => Booking::STATUS_COMPLETED, 'label' => 'Completed'],
            ],
            'statusSummary' => collect($allowedStatuses)->map(fn (string $bookingStatus) => [
                'status' => $bookingStatus,
                'value' => Booking::query()->where('status', $bookingStatus)->count(),
            ])->values(),
            'perPageOptions' => $this->perPageOptions(),
        ]);
    }
}
