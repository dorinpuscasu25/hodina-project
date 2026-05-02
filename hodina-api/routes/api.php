<?php

use App\Http\Controllers\Api\V1\AccommodationController;
use App\Http\Controllers\Api\V1\AiPlannerController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\EmailVerificationController;
use App\Http\Controllers\Api\V1\ExperienceController;
use App\Http\Controllers\Api\V1\GuesthouseController;
use App\Http\Controllers\Api\V1\GuestBookingController;
use App\Http\Controllers\Api\V1\GuestReviewController;
use App\Http\Controllers\Api\V1\HostBookingController;
use App\Http\Controllers\Api\V1\HostDashboardController;
use App\Http\Controllers\Api\V1\HostOrganizationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('email/verify/{id}/{hash}', EmailVerificationController::class)
        ->middleware(['signed'])
        ->name('api.verification.verify');

    Route::prefix('public')->group(function () {
        Route::get('bootstrap', [ExperienceController::class, 'bootstrap']);
        Route::get('experiences', [ExperienceController::class, 'index']);
        Route::get('experiences/{experience}', [ExperienceController::class, 'show']);
        Route::get('experiences/{experience}/sessions', [ExperienceController::class, 'sessions']);

        Route::get('accommodations', [AccommodationController::class, 'index']);
        Route::get('accommodations/{accommodation}', [AccommodationController::class, 'show']);
        Route::get('guesthouses/{guesthouse}', [GuesthouseController::class, 'show']);

        Route::post('ai/plan', [AiPlannerController::class, 'plan']);
    });

    Route::prefix('client/auth')->group(function () {
        Route::post('register', [AuthController::class, 'registerGuest']);
        Route::post('login', [AuthController::class, 'loginGuest']);
    });

    Route::prefix('host/auth')->group(function () {
        Route::post('login', [AuthController::class, 'loginHost']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::patch('auth/me', [AuthController::class, 'updateProfile']);
        Route::patch('auth/password', [AuthController::class, 'updatePassword']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/email/resend', [AuthController::class, 'resendVerification']);
    });

    Route::middleware(['auth:sanctum', 'verified', 'role:guest'])->prefix('client')->group(function () {
        Route::get('bookings', [GuestBookingController::class, 'index']);
        Route::get('bookings/{booking}', [GuestBookingController::class, 'show']);
        Route::post('bookings/experiences/{session}', [GuestBookingController::class, 'storeExperienceBooking']);
        Route::post('bookings/accommodations/{accommodation}', [GuestBookingController::class, 'storeAccommodationBooking']);
        Route::post('bookings/{booking}/cancel', [GuestBookingController::class, 'cancel']);
        Route::match(['post', 'put'], 'bookings/{booking}/review', [GuestReviewController::class, 'storeOrUpdate']);

        Route::get('bookings/{booking}/messages', [ConversationController::class, 'indexForGuest']);
        Route::post('bookings/{booking}/messages', [ConversationController::class, 'storeForGuest']);
    });

    Route::middleware(['auth:sanctum', 'verified', 'role:host'])->prefix('host')->group(function () {
        Route::get('dashboard', [HostDashboardController::class, 'summary']);
        Route::get('dashboard/statistics', [HostDashboardController::class, 'statistics']);
        Route::get('calendar', [HostDashboardController::class, 'calendar']);
        Route::post('calendar/events', [HostDashboardController::class, 'storeCalendarEvent']);
        Route::patch('calendar/events/{event}', [HostDashboardController::class, 'updateCalendarEvent']);
        Route::delete('calendar/events/{event}', [HostDashboardController::class, 'destroyCalendarEvent']);
        Route::patch('calendar/sessions/{session}', [HostDashboardController::class, 'updateCalendarSession']);
        Route::delete('calendar/sessions/{session}', [HostDashboardController::class, 'destroyCalendarSession']);
        Route::get('organization', [HostOrganizationController::class, 'show']);
        Route::patch('organization', [HostOrganizationController::class, 'update']);
        Route::patch('organization/availability', [HostOrganizationController::class, 'updateAvailability']);
        Route::post('organization/members', [HostOrganizationController::class, 'storeMember']);
        Route::patch('organization/members/{member}', [HostOrganizationController::class, 'updateMember']);
        Route::delete('organization/members/{member}', [HostOrganizationController::class, 'destroyMember']);

        Route::get('experiences', [ExperienceController::class, 'hostIndex']);
        Route::post('experiences', [ExperienceController::class, 'store']);
        Route::get('experiences/{experience}', [ExperienceController::class, 'hostShow']);
        Route::put('experiences/{experience}', [ExperienceController::class, 'update']);
        Route::delete('experiences/{experience}', [ExperienceController::class, 'destroy']);
        Route::post('experiences/{experience}/sessions', [ExperienceController::class, 'storeSession']);

        Route::get('accommodations', [AccommodationController::class, 'hostIndex']);
        Route::post('accommodations', [AccommodationController::class, 'store']);
        Route::get('accommodations/{accommodation}', [AccommodationController::class, 'hostShow']);
        Route::put('accommodations/{accommodation}', [AccommodationController::class, 'update']);
        Route::delete('accommodations/{accommodation}', [AccommodationController::class, 'destroy']);

        Route::get('bookings', [HostBookingController::class, 'index']);
        Route::get('bookings/{booking}', [HostBookingController::class, 'show']);
        Route::post('bookings/{booking}/confirm', [HostBookingController::class, 'confirm']);
        Route::post('bookings/{booking}/reject', [HostBookingController::class, 'reject']);
        Route::post('bookings/{booking}/cancel', [HostBookingController::class, 'cancel']);

        Route::get('bookings/{booking}/messages', [ConversationController::class, 'indexForHost']);
        Route::post('bookings/{booking}/messages', [ConversationController::class, 'storeForHost']);
    });
});
