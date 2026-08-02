<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - CQMP /api/v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Public: Authentication ─────────────────────────────────────────
    // Throttle: max 10 login attempts per minute per IP.
    // Prevents brute-force credential stuffing attacks.
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1')
        ->name('api.login');

    // ── Public: Visitor Booking (no auth) ─────────────────────────────
    // Doctor list: cache-friendly, allow 60/min (display only)
    Route::get('/public/doctors', [QueueController::class, 'publicDoctors'])
        ->middleware('throttle:60,1')
        ->name('public.doctors');

    // Public queue view: read-only for TV display — 60/min per IP
    Route::get('/public/queue', [QueueController::class, 'publicQueue'])
        ->middleware('throttle:60,1')
        ->name('public.queue');

    // Public book: 20/min per IP — prevents automated queue flooding
    // and patient record spam from bots.
    Route::post('/public/book', [QueueController::class, 'publicBook'])
        ->middleware('throttle:20,1')
        ->name('public.book');

    // Public display mode endpoint for unauthenticated signage screens
    Route::get('/display/mode', [\App\Http\Controllers\Api\DisplayStateController::class, 'show'])
        ->middleware('throttle:60,1')
        ->name('display.mode');

    // ── Public: Booking Endpoints (no auth) ───────────────────────────
    Route::post('/public/bookings', [\App\Http\Controllers\Api\BookingController::class, 'publicStore'])
        ->middleware('throttle:10,1')
        ->name('public.bookings.store');
    Route::get('/public/bookings/{booking_number}', [\App\Http\Controllers\Api\BookingController::class, 'publicLookup'])
        ->middleware('throttle:30,1')
        ->name('public.bookings.lookup');
    Route::get('/public/bookings-stats', [\App\Http\Controllers\Api\BookingController::class, 'stats'])
        ->middleware('throttle:60,1')
        ->name('public.bookings.stats');

    // ── Public: Settings (no auth) ────────────────────────────────────
    Route::get('/settings/public', [SettingsController::class, 'publicSettings'])->name('settings.public');

    // ── Protected: Require JWT token ───────────────────────────────────
    // Global throttle of 120 requests/minute for authenticated users.
    Route::middleware([\App\Http\Middleware\JwtMiddleware::class, 'throttle:120,1'])->group(function () {

        // Auth
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
        Route::get('/me',      [AuthController::class, 'me'])->name('api.me');

        // Settings (Super Admin / Admin)
        Route::get('/settings', [SettingsController::class, 'index'])->middleware('role:Super Admin|Admin')->name('settings.index');
        Route::put('/settings', [SettingsController::class, 'update'])->middleware('role:Super Admin|Admin')->name('settings.update');
        Route::post('/settings/upload', [SettingsController::class, 'upload'])->middleware('role:Super Admin|Admin')->name('settings.upload');

        // Profile (Any Authenticated User)
        Route::put('/profile/name',     [ProfileController::class, 'updateName'])->name('profile.name');
        Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
        Route::post('/profile/avatar',  [ProfileController::class, 'updateAvatar'])->name('profile.avatar');

        // Patients (Super Admin, Admin, Receptionist, Doctor)
        Route::apiResource('patients', PatientController::class)
            ->middleware('role:Super Admin|Admin|Receptionist|Doctor');

        // Queue Operations (Super Admin, Admin, Receptionist, Doctor, TV)
        Route::prefix('queue')->name('queue.')->group(function () {
            Route::get('/today',      [QueueController::class, 'today'])->name('today'); // Allowed for viewing
            
            // Queue Management Operations (Super Admin, Admin, Receptionist, Doctor)
            Route::middleware('role:Super Admin|Admin|Receptionist|Doctor')->group(function () {
                Route::post('/open',      [QueueController::class, 'open'])->name('open');
                Route::post('/create',    [QueueController::class, 'create'])->name('create');
                Route::post('/call-next', [QueueController::class, 'callNext'])->name('call-next');
                Route::post('/complete',  [QueueController::class, 'complete'])->name('complete');
                Route::post('/skip',      [QueueController::class, 'skip'])->name('skip');
                Route::post('/reinsert',  [QueueController::class, 'reinsert'])->name('reinsert');
                Route::post('/emergency', [QueueController::class, 'emergency'])->name('emergency');
                Route::post('/freeze',    [QueueController::class, 'freeze'])->name('freeze');
                Route::post('/resume',    [QueueController::class, 'resume'])->name('resume');
                Route::delete('/{queueItem}', [QueueController::class, 'destroy'])->name('delete');
            });
        });

        // Doctor Panel Actions (Super Admin, Admin, Doctor)
        Route::post('/doctor/delay', [QueueController::class, 'updateDelay'])
            ->middleware('role:Super Admin|Admin|Doctor')
            ->name('doctor.delay');

        // Centralized Display State Management (Super Admin, Admin, Receptionist, Doctor)
        Route::prefix('display')->name('display.')->group(function () {
            Route::post('/mode', [\App\Http\Controllers\Api\DisplayStateController::class, 'update'])
                ->middleware('role:Super Admin|Admin|Receptionist|Doctor')
                ->name('update');
            Route::post('/resume', [\App\Http\Controllers\Api\DisplayStateController::class, 'resume'])
                ->middleware('role:Super Admin|Admin|Receptionist|Doctor')
                ->name('resume');
        });

        // Booking Management (Super Admin, Admin, Receptionist, Doctor)
        Route::prefix('bookings')->name('bookings.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\BookingController::class, 'index'])
                ->middleware('role:Super Admin|Admin|Receptionist|Doctor')
                ->name('index');
            Route::get('/stats', [\App\Http\Controllers\Api\BookingController::class, 'stats'])
                ->middleware('role:Super Admin|Admin|Receptionist|Doctor')
                ->name('stats');
            Route::get('/{booking}', [\App\Http\Controllers\Api\BookingController::class, 'show'])
                ->middleware('role:Super Admin|Admin|Receptionist|Doctor')
                ->name('show');

            Route::middleware('role:Super Admin|Admin|Receptionist')->group(function () {
                Route::post('/', [\App\Http\Controllers\Api\BookingController::class, 'store'])->name('store');
                Route::post('/{booking}/confirm', [\App\Http\Controllers\Api\BookingController::class, 'confirm'])->name('confirm');
                Route::post('/{booking}/cancel', [\App\Http\Controllers\Api\BookingController::class, 'cancel'])->name('cancel');
                Route::post('/{booking}/check-in', [\App\Http\Controllers\Api\BookingController::class, 'checkIn'])->name('check-in');
                Route::post('/{booking}/no-show', [\App\Http\Controllers\Api\BookingController::class, 'noShow'])->name('no-show');
                Route::post('/convert-today', [\App\Http\Controllers\Api\BookingController::class, 'convert'])->name('convert');
            });
        });

    });

});
