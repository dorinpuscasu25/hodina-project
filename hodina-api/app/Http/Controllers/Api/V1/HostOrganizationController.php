<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Experience;
use App\Models\Guesthouse;
use App\Models\User;
use App\Support\MediaUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HostOrganizationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $guesthouse = $this->hostGuesthouse($request);
        $user = $request->user();

        $accommodations = Accommodation::query()
            ->where('guesthouse_id', $guesthouse->id)
            ->latest()
            ->get()
            ->map(function (Accommodation $accommodation) use ($guesthouse) {
                $activeBookings = Booking::query()
                    ->where('bookable_type', Accommodation::class)
                    ->where('bookable_id', $accommodation->id)
                    ->whereIn('status', Booking::activeStatuses())
                    ->get();

                $unitsReserved = $activeBookings->sum('units');
                $unitsTotal = $accommodation->units_total;

                return [
                    'id' => $accommodation->id,
                    'title' => $accommodation->translated('title', $guesthouse->locale),
                    'units_total' => $unitsTotal,
                    'units_reserved' => $unitsReserved,
                    'units_available' => $unitsTotal !== null ? max($unitsTotal - $unitsReserved, 0) : null,
                    'status' => $accommodation->status,
                    'active_bookings' => $activeBookings->count(),
                    'pending_bookings' => $activeBookings->where('status', Booking::STATUS_PENDING)->count(),
                    'confirmed_bookings' => $activeBookings->where('status', Booking::STATUS_CONFIRMED)->count(),
                    'next_check_in' => $activeBookings
                        ->sortBy('starts_at')
                        ->first()?->starts_at?->toIso8601String(),
                ];
            })
            ->values();

        $unitsTotal = $accommodations->sum(fn (array $item) => $item['units_total'] ?? 0);
        $unitsReserved = $accommodations->sum('units_reserved');
        $activeBookings = $accommodations->sum('active_bookings');
        $upcomingExperienceSessions = Experience::query()
            ->where('guesthouse_id', $guesthouse->id)
            ->withCount(['sessions' => fn ($query) => $query
                ->where('starts_at', '>=', now())])
            ->get()
            ->sum('sessions_count');

        return response()->json([
            'data' => [
                'guesthouse' => $this->guesthousePayload($guesthouse),
                'members' => $guesthouse->users()
                    ->where('role', User::ROLE_HOST)
                    ->orderByRaw("
                        case guesthouse_role
                            when 'owner' then 0
                            when 'manager' then 1
                            when 'editor' then 2
                            else 3
                        end
                    ")
                    ->orderBy('name')
                    ->get()
                    ->map(fn (User $member) => $this->memberPayload($member))
                    ->values(),
                'role_options' => $this->roleOptions(),
                'permissions' => [
                    'can_manage_team' => $user->canManageGuesthouseTeam(),
                    'can_manage_settings' => $user->canManageGuesthouseTeam(),
                ],
                'availability' => [
                    'accommodations' => $accommodations,
                    'summary' => [
                        'accommodation_count' => $accommodations->count(),
                        'units_total' => $unitsTotal,
                        'units_reserved' => $unitsReserved,
                        'units_available' => max($unitsTotal - $unitsReserved, 0),
                        'active_bookings' => $activeBookings,
                        'upcoming_experience_sessions' => $upcomingExperienceSessions,
                    ],
                    'schedule' => $this->availabilitySettings($guesthouse),
                    'upcoming_experience_sessions' => $upcomingExperienceSessions,
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->canManageGuesthouseTeam(), 403, 'You are not allowed to manage organization settings.');

        $guesthouse = $this->hostGuesthouse($request);
        $contentLocale = $guesthouse->locale ?: 'ro';

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'public_email' => ['nullable', 'email', 'max:255'],
            'public_phone' => ['nullable', 'string', 'max:30'],
            'locale' => ['required', 'string', Rule::in(array_keys(config('hodina.supported_locales')))],
            'currency' => ['required', 'string', 'size:3'],
            'country' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'check_in_notes' => ['nullable', 'string'],
            'house_rules' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'cover_image_file' => ['nullable', 'image', 'max:5120'],
            'remove_cover_image' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('remove_cover_image')) {
            MediaUploader::delete($guesthouse->cover_image);
            $guesthouse->cover_image = null;
        } elseif ($request->hasFile('cover_image_file')) {
            $guesthouse->cover_image = MediaUploader::store(
                $request->file('cover_image_file'),
                'guesthouses/covers',
                $guesthouse->cover_image,
            );
        } elseif (array_key_exists('cover_image', $validated)) {
            $guesthouse->cover_image = $validated['cover_image'] ?: null;
        }

        $guesthouse->fill([
            'public_email' => $validated['public_email'] ?? null,
            'public_phone' => $validated['public_phone'] ?? null,
            'locale' => $validated['locale'],
            'currency' => strtoupper($validated['currency']),
            'country' => $validated['country'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        $guesthouse->setTranslation('name', $contentLocale, $validated['name']);
        $guesthouse->setTranslation('description', $contentLocale, $validated['description'] ?? '');
        $guesthouse->setTranslation('check_in_notes', $contentLocale, $validated['check_in_notes'] ?? '');
        $guesthouse->setTranslation('house_rules', $contentLocale, $validated['house_rules'] ?? '');
        $guesthouse->save();

        return response()->json([
            'data' => $this->guesthousePayload($guesthouse->fresh()),
        ]);
    }

    public function updateAvailability(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->canManageGuesthouseTeam(), 403, 'You are not allowed to manage organization settings.');

        $guesthouse = $this->hostGuesthouse($request);

        $validated = $request->validate([
            'working_days' => ['required', 'array'],
            'working_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'opening_time' => ['nullable', 'date_format:H:i'],
            'closing_time' => ['nullable', 'date_format:H:i'],
            'days_off' => ['nullable', 'array'],
            'days_off.*' => ['date'],
            'note' => ['nullable', 'string'],
        ]);

        $settings = $guesthouse->settings ?? [];
        $settings['availability'] = [
            'working_days' => array_values($validated['working_days']),
            'opening_time' => $validated['opening_time'] ?? null,
            'closing_time' => $validated['closing_time'] ?? null,
            'days_off' => collect($validated['days_off'] ?? [])
                ->map(fn (string $value) => date('Y-m-d', strtotime($value)))
                ->values()
                ->all(),
            'note' => $validated['note'] ?? null,
        ];

        $guesthouse->settings = $settings;
        $guesthouse->save();

        return response()->json([
            'data' => $this->availabilitySettings($guesthouse->fresh()),
        ]);
    }

    public function storeMember(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor->canManageGuesthouseTeam(), 403, 'You are not allowed to manage team members.');

        $guesthouse = $this->hostGuesthouse($request);
        $validated = $this->validateMember($request);

        $member = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => $validated['password'],
            'role' => User::ROLE_HOST,
            'guesthouse_role' => $validated['guesthouse_role'],
            'guesthouse_id' => $guesthouse->id,
            'phone' => $validated['phone'] ?? null,
            'locale' => $validated['locale'] ?? $guesthouse->locale,
            'timezone' => $validated['timezone'] ?? 'Europe/Chisinau',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data' => $this->memberPayload($member),
        ], 201);
    }

    public function updateMember(Request $request, User $member): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor->canManageGuesthouseTeam(), 403, 'You are not allowed to manage team members.');

        $guesthouse = $this->hostGuesthouse($request);
        abort_unless(
            $member->role === User::ROLE_HOST && (int) $member->guesthouse_id === (int) $guesthouse->id,
            404,
        );

        $validated = $this->validateMember($request, true, $member);

        if (($validated['is_active'] ?? true) === false && $member->is($actor)) {
            abort(422, 'You cannot deactivate your own account.');
        }

        if (($validated['guesthouse_role'] ?? $member->guesthouse_role) !== User::GUESTHOUSE_ROLE_OWNER && $member->isGuesthouseOwner()) {
            $this->ensureAnotherOwnerExists($guesthouse, $member);
        }

        if (($validated['is_active'] ?? $member->is_active) === false && $member->isGuesthouseOwner()) {
            $this->ensureAnotherOwnerExists($guesthouse, $member);
        }

        $member->fill([
            'name' => $validated['name'] ?? $member->name,
            'email' => isset($validated['email']) ? strtolower($validated['email']) : $member->email,
            'guesthouse_role' => $validated['guesthouse_role'] ?? $member->guesthouse_role,
            'phone' => $validated['phone'] ?? $member->phone,
            'locale' => $validated['locale'] ?? $member->locale,
            'timezone' => $validated['timezone'] ?? $member->timezone,
            'is_active' => $validated['is_active'] ?? $member->is_active,
        ]);

        if (! empty($validated['password'])) {
            $member->password = $validated['password'];
        }

        $member->save();

        return response()->json([
            'data' => $this->memberPayload($member),
        ]);
    }

    public function destroyMember(Request $request, User $member): JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor->canManageGuesthouseTeam(), 403, 'You are not allowed to manage team members.');

        $guesthouse = $this->hostGuesthouse($request);
        abort_unless(
            $member->role === User::ROLE_HOST && (int) $member->guesthouse_id === (int) $guesthouse->id,
            404,
        );

        abort_if($member->is($actor), 422, 'You cannot remove your own account.');

        if ($member->isGuesthouseOwner()) {
            $this->ensureAnotherOwnerExists($guesthouse, $member);
        }

        $member->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Member deactivated successfully.',
        ]);
    }

    private function validateMember(Request $request, bool $isUpdate = false, ?User $member = null): array
    {
        return $request->validate([
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'email' => [
                $isUpdate ? 'sometimes' : 'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($member?->id),
            ],
            'password' => [$isUpdate ? 'nullable' : 'required', 'confirmed', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'locale' => ['nullable', 'string', Rule::in(array_keys(config('hodina.supported_locales')))],
            'timezone' => ['nullable', 'string', 'max:100'],
            'guesthouse_role' => [
                $isUpdate ? 'sometimes' : 'required',
                Rule::in(array_column($this->roleOptions(), 'value')),
            ],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }

    private function ensureAnotherOwnerExists(Guesthouse $guesthouse, User $ignoredMember): void
    {
        $otherOwnerExists = $guesthouse->users()
            ->where('role', User::ROLE_HOST)
            ->where('guesthouse_role', User::GUESTHOUSE_ROLE_OWNER)
            ->whereKeyNot($ignoredMember->id)
            ->where('is_active', true)
            ->exists();

        abort_unless($otherOwnerExists, 422, 'Guesthouse must keep at least one active owner.');
    }

    private function hostGuesthouse(Request $request): Guesthouse
    {
        $guesthouse = $request->user()->guesthouse;

        abort_unless($guesthouse, 422, 'Host account is not attached to a guesthouse.');

        return $guesthouse;
    }

    private function guesthousePayload(Guesthouse $guesthouse): array
    {
        return array_merge($guesthouse->toApiArray($guesthouse->locale), [
            'description' => $guesthouse->translated('description', $guesthouse->locale),
            'check_in_notes' => $guesthouse->translated('check_in_notes', $guesthouse->locale),
            'house_rules' => $guesthouse->translated('house_rules', $guesthouse->locale),
        ]);
    }

    private function memberPayload(User $member): array
    {
        return array_merge($member->toApiArray(), [
            'status' => $member->is_active ? 'active' : 'inactive',
            'last_login_at' => $member->last_login_at?->toIso8601String(),
        ]);
    }

    private function roleOptions(): array
    {
        return [
            ['value' => User::GUESTHOUSE_ROLE_OWNER, 'label' => 'Owner'],
            ['value' => User::GUESTHOUSE_ROLE_MANAGER, 'label' => 'Manager'],
            ['value' => User::GUESTHOUSE_ROLE_EDITOR, 'label' => 'Editor'],
            ['value' => User::GUESTHOUSE_ROLE_VIEWER, 'label' => 'Viewer'],
        ];
    }

    private function availabilitySettings(Guesthouse $guesthouse): array
    {
        $availability = $guesthouse->settings['availability'] ?? [];

        return [
            'working_days' => array_values($availability['working_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
            'opening_time' => $availability['opening_time'] ?? '09:00',
            'closing_time' => $availability['closing_time'] ?? '18:00',
            'days_off' => array_values($availability['days_off'] ?? []),
            'note' => $availability['note'] ?? null,
        ];
    }
}
