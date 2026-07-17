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
    Route::post('/login', [AuthController::class, 'login'])->name('api.login');

    // ── Public: Visitor Booking (no auth) ─────────────────────────────
    Route::get('/public/doctors', [QueueController::class, 'publicDoctors'])->name('public.doctors');
    Route::post('/public/book',   [QueueController::class, 'publicBook'])->name('public.book');

    // ── Protected: Require Sanctum token ──────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

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
