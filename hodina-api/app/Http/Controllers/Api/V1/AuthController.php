<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function registerGuest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'locale' => ['nullable', 'string', 'in:en,ro,ru'],
            'timezone' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => Str::lower($validated['email']),
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'role' => User::ROLE_GUEST,
            'locale' => $validated['locale'] ?? 'ro',
            'timezone' => $validated['timezone'] ?? 'Europe/Chisinau',
            'is_active' => true,
        ]);

        $token = $user->createToken('client-'.Str::limit($request->userAgent() ?: 'browser', 40, ''))->plainTextToken;

        return response()->json($this->authPayload($user, $token), 201);
    }

    public function loginGuest(Request $request): JsonResponse
    {
        return $this->login($request, User::ROLE_GUEST, 'client');
    }

    public function loginHost(Request $request): JsonResponse
    {
        return $this->login($request, User::ROLE_HOST, 'host');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('guesthouse');

        return response()->json([
            'data' => [
                'user' => $user->toApiArray(),
                'guesthouse' => $user->guesthouse?->toApiArray($user->locale),
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'locale' => ['nullable', 'string', 'in:en,ro,ru'],
            'timezone' => ['nullable', 'string', 'max:100'],
        ]);

        $user->fill([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'locale' => $validated['locale'] ?? $user->locale,
            'timezone' => $validated['timezone'] ?? $user->timezone,
        ]);
        $user->save();

        $user->load('guesthouse');

        return response()->json([
            'data' => [
                'user' => $user->toApiArray(),
                'guesthouse' => $user->guesthouse?->toApiArray($user->locale),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent.',
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $user = $request->user();
        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    private function login(Request $request, string $role, string $tokenPrefix): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', Str::lower($validated['email']))
            ->where('role', $role)
            ->with('guesthouse')
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'This account is inactive.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken(
            $tokenPrefix.'-'.Str::limit($request->userAgent() ?: 'browser', 40, '')
        )->plainTextToken;

        return response()->json($this->authPayload($user, $token));
    }

    private function authPayload(User $user, string $token): array
    {
        $user->loadMissing('guesthouse');

        return [
            'data' => [
                'token' => $token,
                'user' => $user->toApiArray(),
                'guesthouse' => $user->guesthouse?->toApiArray($user->locale),
                'requires_email_verification' => ! $user->hasVerifiedEmail(),
            ],
        ];
    }
}
