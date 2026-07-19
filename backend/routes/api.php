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
    Route::post('/login', [AuthController::class, 'login'])->name('api.login');

    // ── Public: Visitor Booking (no auth) ─────────────────────────────
    Route::get('/public/doctors', [QueueController::class, 'publicDoctors'])->name('public.doctors');
    Route::post('/public/book',   [QueueController::class, 'publicBook'])->name('public.book');

    // ── Public: Settings (no auth) ────────────────────────────────────
    Route::get('/settings/public', [SettingsController::class, 'publicSettings'])->name('settings.public');

    // ── Protected: Require Sanctum token ──────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
        Route::get('/me',      [AuthController::class, 'me'])->name('api.me');

        // Settings (Super Admin)
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::post('/settings/upload', [SettingsController::class, 'upload'])->name('settings.upload');

        // Profile
        Route::put('/profile/name',     [ProfileController::class, 'updateName'])->name('profile.name');
        Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
        Route::post('/profile/avatar',  [ProfileController::class, 'updateAvatar'])->name('profile.avatar');

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
