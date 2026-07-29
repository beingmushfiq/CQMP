<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\QueueController;
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

    // Public book: 20/min per IP — prevents automated queue flooding
    // and patient record spam from bots.
    Route::post('/public/book', [QueueController::class, 'publicBook'])
        ->middleware('throttle:20,1')
        ->name('public.book');

    // ── Protected: Require Sanctum token ──────────────────────────────
    // Global throttle of 120 requests/minute for authenticated users.
    Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {

        // Auth
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
        Route::get('/me',      [AuthController::class, 'me'])->name('api.me');

        // Patients
        Route::apiResource('patients', PatientController::class);

        // Queue Operations
        Route::prefix('queue')->name('queue.')->group(function () {
            Route::get('/today',      [QueueController::class, 'today'])->name('today');
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

        // Doctor Panel Actions
        Route::post('/doctor/delay', [QueueController::class, 'updateDelay'])->name('doctor.delay');

    });

});
