<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class BookingConversionService
{
    public function __construct(
        private readonly QueueEngine $queueEngine
    ) {}

    /**
     * Converts all Confirmed & CheckedIn bookings for the date into today's queue_items.
     * Order of conversion follows booking creation sequence / serial assignment.
     */
    public function convertForDate(string $date, QueueDay $queueDay, ?User $actor = null): int
    {
        $bookings = Booking::forDate($date)
            ->whereIn('status', [BookingStatus::CONFIRMED->value, BookingStatus::CHECKED_IN->value])
            ->whereNull('converted_at')
            ->orderBy('id', 'asc')
            ->get();

        if ($bookings->isEmpty()) {
            return 0;
        }

        $convertedCount = 0;

        DB::transaction(function () use ($bookings, $queueDay, $actor, &$convertedCount) {
            foreach ($bookings as $booking) {
                // Ensure patient record exists
                $patient = $booking->patient;
                if (! $patient) {
                    $patient = Patient::firstOrCreate(
                        ['phone' => $booking->patient_phone],
                        ['name' => $booking->patient_name]
                    );
                    $booking->patient_id = $patient->id;
                }

                // Skip if patient is blocked
                if ($patient->is_blocked) {
                    continue;
                }

                // Create Queue Item using existing QueueEngine
                $queueItem = $this->queueEngine->createWalkIn(
                    $queueDay,
                    $patient,
                    'Normal',
                    null // Auto-assign next sequential serial
                );

                // Attach remarks / booking origin
                $queueItem->update([
                    'remarks'          => trim(($booking->remarks ? $booking->remarks . ' | ' : '') . "Booking: {$booking->booking_number} ({$booking->patient_type})"),
                    'appointment_type' => 'Online', // Mark converted booking as Online appointment
                ]);

                // Update Booking record
                $booking->update([
                    'status'        => BookingStatus::COMPLETED,
                    'serial_no'     => $queueItem->serial_no,
                    'queue_item_id' => $queueItem->id,
                    'converted_at'  => now(),
                    'converted_by'  => $actor?->id,
                ]);

                $convertedCount++;
            }
        });

        if ($convertedCount > 0) {
            $this->broadcastConversion($queueDay, $convertedCount);
        }

        return $convertedCount;
    }

    private function broadcastConversion(QueueDay $queueDay, int $count): void
    {
        try {
            $nodeWsUrl = rtrim(env('NODE_WS_URL', 'http://127.0.0.1:3001'), '/');
            Http::timeout(3)->post("{$nodeWsUrl}/broadcast", [
                'channel' => 'bookings',
                'event'   => 'bookings.converted',
                'data'    => [
                    'queue_day_id' => $queueDay->id,
                    'date'         => $queueDay->date->toDateString(),
                    'count'        => $count,
                ],
            ]);
        } catch (\Throwable) {
            // Best effort
        }
    }
}
