<?php

use App\Http\Controllers\Admin\BookingController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\GuesthouseController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route(Auth::user()?->isAdmin() ? 'admin.dashboard' : 'dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        if (request()->user()?->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::prefix('admin')->name('admin.')->middleware('role:admin')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('dashboard');

        Route::get('guesthouses', [GuesthouseController::class, 'index'])->name('guesthouses.index');
        Route::get('guesthouses/create', [GuesthouseController::class, 'create'])->name('guesthouses.create');
        Route::post('guesthouses', [GuesthouseController::class, 'store'])->name('guesthouses.store');
        Route::get('guesthouses/{guesthouse}/edit', [GuesthouseController::class, 'edit'])->name('guesthouses.edit');
        Route::patch('guesthouses/{guesthouse}', [GuesthouseController::class, 'update'])->name('guesthouses.update');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::get('users/create', [UserController::class, 'create'])->name('users.create');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
        Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update');

        Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::get('categories/create', [CategoryController::class, 'create'])->name('categories.create');
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::get('categories/{category}/edit', [CategoryController::class, 'edit'])->name('categories.edit');
        Route::patch('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');

        Route::get('bookings', [BookingController::class, 'index'])->name('bookings.index');
    });
});

require __DIR__.'/settings.php';
