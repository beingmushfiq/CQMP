<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(
        private readonly BookingConversionService $conversionService
    ) {}

    public function generateBookingNumber(string $date): string
    {
        $dateStr = Carbon::parse($date)->format('Ymd');
        $prefix = "BK-{$dateStr}-";

        return DB::transaction(function () use ($prefix) {
            $latest = Booking::where('booking_number', 'LIKE', "{$prefix}%")
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $latest) {
                $nextSeq = 1;
            } else {
                $parts = explode('-', $latest->booking_number);
                $lastSeq = (int) end($parts);
                $nextSeq = $lastSeq + 1;
            }

            return $prefix . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
        });
    }

    public function validateBookingRequest(array $data, bool $isPublic = false): void
    {
        $bookingDate = Carbon::parse($data['booking_date'])->toDateString();
        $today = Carbon::today()->toDateString();
        $tomorrow = Carbon::tomorrow()->toDateString();

        if ($isPublic) {
            // 1. Booking window check (Currently restricted to tomorrow for public/default settings)
            $maxWindow = (int) Setting::get('booking_window_days', 1);
            $maxDate = Carbon::today()->addDays($maxWindow)->toDateString();

            if ($bookingDate < $tomorrow || $bookingDate > $maxDate) {
                throw ValidationException::withMessages([
                    'booking_date' => ["Bookings are currently only allowed for tomorrow ({$tomorrow})."],
                ]);
            }

            // 2. Cutoff time check for booking tomorrow
            $cutoffTimeStr = Setting::get('booking_cutoff_time', '22:00');
            if (empty($cutoffTimeStr)) {
                $cutoffTimeStr = '22:00';
            }
            try {
                $cutoffTime = Carbon::createFromTimeString($cutoffTimeStr);
                if (now()->isAfter($cutoffTime) && $bookingDate === $tomorrow) {
                    throw ValidationException::withMessages([
                        'booking_date' => ["Bookings for tomorrow are closed as cutoff time ({$cutoffTimeStr}) has passed."],
                    ]);
                }
            } catch (\Carbon\Exceptions\InvalidFormatException|\Exception $e) {
                if ($e instanceof ValidationException) {
                    throw $e;
                }
                // Ignore invalid cutoff time string from settings
            }
        } else {
            // Staff / Authenticated booking: cannot book past dates
            if ($bookingDate < $today) {
                throw ValidationException::withMessages([
                    'booking_date' => ['Cannot create a booking for a past date.'],
                ]);
            }
        }

        // 3. Max capacity check
        $maxPerDay = (int) Setting::get('booking_max_per_day', 50);
        $currentActiveCount = Booking::forDate($bookingDate)->active()->count();

        if ($currentActiveCount >= $maxPerDay) {
            throw ValidationException::withMessages([
                'booking_date' => ['Selected date is fully booked.'],
            ]);
        }

        // 4. Duplicate booking check (Same phone & same date - only if phone is provided)
        if (! empty($data['patient_phone'])) {
            $exists = Booking::forDate($bookingDate)
                ->where('patient_phone', $data['patient_phone'])
                ->whereIn('status', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value, BookingStatus::CHECKED_IN->value])
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'patient_phone' => ['A booking already exists for this phone number for the selected date.'],
                ]);
            }
        }
    }

    public function create(array $data, ?User $actor = null): Booking
    {
        $this->validateBookingRequest($data, $actor === null);

        $bookingDate = Carbon::parse($data['booking_date'])->toDateString();
        $bookingNumber = $this->generateBookingNumber($bookingDate);

        // Find or create patient record if phone is given
        $patientPhone = ! empty($data['patient_phone']) ? trim($data['patient_phone']) : '';
        $patient = null;
        if (! empty($patientPhone)) {
            $patient = Patient::firstOrCreate(
                ['phone' => $patientPhone],
                ['name'  => $data['patient_name']]
            );
        }

        $autoConfirm = filter_var(Setting::get('booking_auto_confirm', false), FILTER_VALIDATE_BOOLEAN);
        $initialStatus = $autoConfirm ? BookingStatus::CONFIRMED : BookingStatus::PENDING;

        $booking = Booking::create([
            'booking_number' => $bookingNumber,
            'doctor_id'      => $data['doctor_id'],
            'patient_id'     => $patient?->id,
            'patient_name'   => $data['patient_name'],
            'patient_phone'  => $patientPhone,
            'patient_type'   => $data['patient_type'] ?? 'New',
            'booking_date'   => $bookingDate,
            'preferred_slot' => ! empty($data['preferred_slot']) ? $data['preferred_slot'] : null,
            'remarks'        => ! empty($data['remarks']) ? $data['remarks'] : null,
            'status'         => $initialStatus,
            'confirmed_at'   => $autoConfirm ? now() : null,
            'confirmed_by'   => $autoConfirm ? $actor?->id : null,
            'created_by'     => $actor?->id,
        ]);

        $this->broadcast('booking.created', $booking);
        $this->sendSmsNotification($booking, 'booking_created');

        return $booking;
    }

    public function confirm(Booking $booking, User $actor): Booking
    {
        if (! $booking->status->canTransitionTo(BookingStatus::CONFIRMED)) {
            throw ValidationException::withMessages(['status' => ["Cannot confirm booking in {$booking->status->value} state."]]);
        }

        $booking->update([
            'status'       => BookingStatus::CONFIRMED,
            'confirmed_at' => now(),
            'confirmed_by' => $actor->id,
        ]);

        $this->broadcast('booking.confirmed', $booking);
        $this->sendSmsNotification($booking, 'booking_confirmed');

        // If the queue is already open for today, convert immediately
        $this->maybeConvertToQueue($booking);

        return $booking;
    }

    public function cancel(Booking $booking, User $actor, ?string $reason = null): Booking
    {
        if (! $booking->status->canTransitionTo(BookingStatus::CANCELLED)) {
            throw ValidationException::withMessages(['status' => ["Cannot cancel booking in {$booking->status->value} state."]]);
        }

        $booking->update([
            'status'        => BookingStatus::CANCELLED,
            'cancelled_at'  => now(),
            'cancelled_by'  => $actor->id,
            'cancel_reason' => $reason,
        ]);

        $this->broadcast('booking.cancelled', $booking);
        $this->sendSmsNotification($booking, 'booking_cancelled');

        return $booking;
    }

    public function checkIn(Booking $booking, User $actor): Booking
    {
        if (! $booking->status->canTransitionTo(BookingStatus::CHECKED_IN)) {
            throw ValidationException::withMessages(['status' => ["Cannot check in booking in {$booking->status->value} state."]]);
        }

        $booking->update([
            'status'        => BookingStatus::CHECKED_IN,
            'checked_in_at' => now(),
            'checked_in_by' => $actor->id,
        ]);

        $this->broadcast('booking.checked_in', $booking);

        // If the queue is already open for today, convert immediately
        $this->maybeConvertToQueue($booking);

        return $booking;
    }

    public function noShow(Booking $booking, User $actor): Booking
    {
        if (! $booking->status->canTransitionTo(BookingStatus::NO_SHOW)) {
            throw ValidationException::withMessages(['status' => ["Cannot mark as No Show in {$booking->status->value} state."]]);
        }

        $booking->update([
            'status' => BookingStatus::NO_SHOW,
        ]);

        $this->broadcast('booking.no_show', $booking);

        return $booking;
    }

    public function delete(Booking $booking, User $actor): void
    {
        $this->broadcast('booking.deleted', $booking);
        $booking->delete();
    }

    /**
     * Immediately convert a booking into a queue item if today's queue is
     * already open for the booking's doctor. This handles the case where a
     * booking is confirmed / checked-in *after* the receptionist opened the
     * queue, so it does not have to wait for the next scheduler sweep.
     */
    private function maybeConvertToQueue(Booking $booking): void
    {
        $bookingDateStr = $booking->booking_date instanceof \DateTimeInterface
            ? $booking->booking_date->format('Y-m-d')
            : Carbon::parse($booking->booking_date)->toDateString();

        // Only relevant if the booking is for today
        if ($bookingDateStr !== Carbon::today()->toDateString()) {
            return;
        }

        // Skip if already converted
        if ($booking->converted_at !== null) {
            return;
        }

        $queueDay = QueueDay::where('doctor_id', $booking->doctor_id)
            ->where('date', '>=', Carbon::today()->startOfDay())
            ->where('date', '<=', Carbon::today()->endOfDay())
            ->where('status', 'opened')
            ->latest()
            ->first();

        if (! $queueDay) {
            return; // Queue not open yet — will convert on queue open or next scheduler run
        }

        rescue(
            fn () => $this->conversionService->convertForDate($bookingDateStr, $queueDay),
            report: true,
        );
    }

    private function broadcast(string $event, Booking $booking): void
    {
        try {
            $nodeWsUrl = rtrim(env('NODE_WS_URL', 'http://127.0.0.1:3001'), '/');
            Http::timeout(3)->post("{$nodeWsUrl}/broadcast", [
                'channel' => 'bookings',
                'event'   => $event,
                'data'    => $booking->load(['patient', 'doctor'])->toArray(),
            ]);
        } catch (\Throwable) {
            // Socket.IO broadcast best-effort fallback
        }
    }

    private function sendSmsNotification(Booking $booking, string $type): void
    {
        // SMS Integration stub using settings keys
        $apiKey = Setting::get('sms_api_key');
        if (! $apiKey || empty($booking->patient_phone)) {
            return;
        }

        $template = match($type) {
            'booking_created'   => Setting::get('sms_booking_created', "Your booking {booking_number} is received for {date}."),
            'booking_confirmed' => Setting::get('sms_booking_confirmed', "Your booking {booking_number} is confirmed for {date}."),
            'booking_cancelled' => Setting::get('sms_booking_cancelled', "Your booking {booking_number} has been cancelled."),
            default => null,
        };

        if (! $template) return;

        $formattedDate = $booking->booking_date instanceof \DateTimeInterface
            ? $booking->booking_date->format('Y-m-d')
            : Carbon::parse($booking->booking_date)->format('Y-m-d');

        $message = str_replace(
            ['{booking_number}', '{date}', '{patient_name}'],
            [$booking->booking_number, $formattedDate, $booking->patient_name],
            $template
        );

        try {
            // Placeholder HTTP POST to provider
            Http::timeout(5)->post(Setting::get('sms_provider_url', 'https://api.sms-provider.com/send'), [
                'api_key'   => $apiKey,
                'recipient' => $booking->patient_phone,
                'message'   => $message,
            ]);
        } catch (\Throwable) {
            // Best-effort SMS
        }
    }
}
