<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ── Advance Booking → Queue Auto-Conversion ────────────────────────────────
//
// PRIMARY: Run at 07:00 each morning so any confirmed bookings for today are
//          injected into the queue as soon as the clinic day begins.
//
// SAFETY NET: Run every 30 min between 07:00–22:00.
//             Catches bookings that were confirmed *after* the queue was
//             already opened (e.g., a walk-in who called and was confirmed
//             at 09:15 while the doctor's queue has been running since 08:00).
//
// NOTE: Requires the following crontab entry on the server (run once):
//       * * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
//
Schedule::command('bookings:convert-today')
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(fn () => \Illuminate\Support\Facades\Log::error('bookings:convert-today (07:00) failed'));

Schedule::command('bookings:convert-today')
    ->everyThirtyMinutes()
    ->between('07:30', '22:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(fn () => \Illuminate\Support\Facades\Log::error('bookings:convert-today (30-min sweep) failed'));

