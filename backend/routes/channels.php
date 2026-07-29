<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channel Authorizations
|--------------------------------------------------------------------------
|
| Register every channel that the frontend subscribes to.
| Public channels (Channel) are open to anyone.
| Private channels (PrivateChannel) require an authenticated user.
|
| CQMP uses public channels throughout because:
|  - queue.{id}          is shown to TV displays (no login) AND clinic staff
|  - doctor-queue.{id}   is polled by receptionist + doctor dashboards
|  - tv.{id}             is explicitly for the public TV display
|
| This is intentional: queue serial numbers are not sensitive data.
| The business logic that IS sensitive (patient names, phones) is only
| returned to authenticated users via the REST API — not via broadcasts.
|
| If you add private events with sensitive payloads in the future,
| switch those channels to PrivateChannel and add auth below.
|
*/

// ── Default Laravel user channel ──────────────────────────────────
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// ── Queue Day channel ─────────────────────────────────────────────
// Receives: QueueCreated, QueueUpdated, QueueCompleted, QueueDeleted,
//           EmergencyInserted, QueueFrozen, QueueResumed, EstimatedTimeUpdated
// Subscribers: ReceptionistDashboard, DoctorDashboard, TvDisplay
// Public: yes — TV display has no auth token, and serial numbers are not sensitive
Broadcast::channel('queue.{queueDayId}', function () {
    return true; // Public channel — intentionally open
});

// ── Doctor Queue channel ───────────────────────────────────────────
// Receives: QueueOpened
// Subscribers: ReceptionistDashboard (waits for doctor to open queue)
// Public: yes — same reasoning as queue channel
Broadcast::channel('doctor-queue.{doctorId}', function () {
    return true; // Public channel — intentionally open
});

// ── TV Display channel ────────────────────────────────────────────
// Receives: QueueCreated (doctor_id variant) — used by TvDisplay.tsx
// Public: yes — this channel is explicitly for the waiting room screen
Broadcast::channel('tv.{doctorId}', function () {
    return true; // Public channel — TV display is unauthenticated
});
