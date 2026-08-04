<?php

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\AuditService;
use App\Services\BookingService;
use App\Services\BookingConversionService;
use App\Models\QueueDay;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly BookingConversionService $conversionService,
        private readonly AuditService $audit
    ) {}

    /**
     * GET /api/v1/bookings
     * Filters: date, status, search (phone/name/booking_number), doctor_id
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date'      => ['nullable', 'date'],
            'status'    => ['nullable', 'string'],
            'search'    => ['nullable', 'string', 'max:100'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        $query = Booking::with(['doctor', 'patient', 'queueItem']);

        if ($request->filled('date')) {
            $query->forDate($request->date);
        } else {
            // Default to tomorrow if not specified
            $query->tomorrow();
        }

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('patient_name', 'LIKE', "%{$search}%")
                  ->orWhere('patient_phone', 'LIKE', "%{$search}%")
                  ->orWhere('booking_number', 'LIKE', "%{$search}%");
            });
        }

        $bookings = $query->orderBy('id', 'asc')->get();

        return response()->json([
            'data' => $bookings,
        ]);
    }

    /**
     * POST /api/v1/bookings (Authenticated Receptionist/Admin)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id'      => ['required', 'exists:doctors,id'],
            'patient_name'   => ['required', 'string', 'max:150'],
            'patient_phone'  => ['nullable', 'string', 'max:20'],
            'patient_type'   => ['required', 'string', 'in:New,Follow-up,Report Showing'],
            'booking_date'   => ['required', 'date'],
            'preferred_slot' => ['nullable', 'string', 'max:50'],
            'remarks'        => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $booking = $this->bookingService->create($data, $request->user());
            $this->audit->log('booking.created', targetPatientId: $booking->patient_id, details: "Booking Number: {$booking->booking_number}", request: $request);

            return response()->json(['booking' => $booking->load(['patient', 'doctor'])], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Booking store failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Booking creation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/public/bookings (Public - No Auth)
     */
    public function publicStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id'      => ['required', 'exists:doctors,id'],
            'patient_name'   => ['required', 'string', 'max:150'],
            'patient_phone'  => ['nullable', 'string', 'max:20'],
            'patient_type'   => ['required', 'string', 'in:New,Follow-up,Report Showing'],
            'booking_date'   => ['required', 'date'],
            'preferred_slot' => ['nullable', 'string', 'max:50'],
            'remarks'        => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $booking = $this->bookingService->create($data, null);

            $dateStr = $booking->booking_date instanceof \DateTimeInterface
                ? $booking->booking_date->format('Y-m-d')
                : Carbon::parse($booking->booking_date)->format('Y-m-d');

            $statusStr = $booking->status instanceof \BackedEnum
                ? $booking->status->value
                : (string) $booking->status;

            return response()->json([
                'message'        => 'Booking created successfully!',
                'booking_number' => $booking->booking_number,
                'booking_date'   => $dateStr,
                'status'         => $statusStr,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Public booking store failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Booking creation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/public/bookings/{booking_number} (Public Lookup)
     */
    public function publicLookup(string $bookingNumber): JsonResponse
    {
        $booking = Booking::where('booking_number', $bookingNumber)->firstOrFail();

        $phone = ! empty($booking->patient_phone)
            ? (strlen($booking->patient_phone) >= 7
                ? substr($booking->patient_phone, 0, 3) . '****' . substr($booking->patient_phone, -4)
                : $booking->patient_phone)
            : 'N/A';

        $dateStr = $booking->booking_date instanceof \DateTimeInterface
            ? $booking->booking_date->format('Y-m-d')
            : Carbon::parse($booking->booking_date)->format('Y-m-d');

        $statusStr = $booking->status instanceof \BackedEnum
            ? $booking->status->value
            : (string) $booking->status;

        return response()->json([
            'booking_number' => $booking->booking_number,
            'patient_name'   => $booking->patient_name,
            'patient_phone'  => $phone,
            'booking_date'   => $dateStr,
            'status'         => $statusStr,
            'serial_no'      => $booking->serial_no,
        ]);
    }

    /**
     * GET /api/v1/bookings/{id}
     */
    public function show(Booking $booking): JsonResponse
    {
        return response()->json(['booking' => $booking->load(['doctor', 'patient', 'queueItem'])]);
    }

    /**
     * POST /api/v1/bookings/{id}/confirm
     */
    public function confirm(Request $request, Booking $booking): JsonResponse
    {
        $updated = $this->bookingService->confirm($booking, $request->user());
        $this->audit->log('booking.confirmed', targetPatientId: $updated->patient_id, details: "Booking: {$updated->booking_number}", request: $request);
        return response()->json(['booking' => $updated]);
    }

    /**
     * POST /api/v1/bookings/{id}/cancel
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $updated = $this->bookingService->cancel($booking, $request->user(), $request->reason);
        $this->audit->log('booking.cancelled', targetPatientId: $updated->patient_id, details: "Booking: {$updated->booking_number}, Reason: {$request->reason}", request: $request);
        return response()->json(['booking' => $updated]);
    }

    /**
     * POST /api/v1/bookings/{id}/check-in
     */
    public function checkIn(Request $request, Booking $booking): JsonResponse
    {
        $updated = $this->bookingService->checkIn($booking, $request->user());
        $this->audit->log('booking.checked_in', targetPatientId: $updated->patient_id, details: "Booking: {$updated->booking_number}", request: $request);
        return response()->json(['booking' => $updated]);
    }

    /**
     * DELETE /api/v1/bookings/{id}
     */
    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        $bookingNumber = $booking->booking_number;
        $patientId = $booking->patient_id;
        $booking->delete();

        $this->audit->log('booking.deleted', targetPatientId: $patientId, details: "Booking Deleted: {$bookingNumber}", request: $request);

        return response()->json(['message' => 'Booking deleted successfully.']);
    }

    /**
     * POST /api/v1/bookings/{id}/no-show
     */
    public function noShow(Request $request, Booking $booking): JsonResponse
    {
        $updated = $this->bookingService->noShow($booking, $request->user());
        $this->audit->log('booking.no_show', targetPatientId: $updated->patient_id, details: "Booking: {$updated->booking_number}", request: $request);
        return response()->json(['booking' => $updated]);
    }

    /**
     * POST /api/v1/bookings/convert-today
     * Manually trigger conversion of confirmed bookings for today or specified date.
     */
    public function convert(Request $request): JsonResponse
    {
        $request->validate([
            'date'         => ['required', 'date'],
            'queue_day_id' => ['required', 'exists:queue_days,id'],
        ]);

        $queueDay = QueueDay::findOrFail($request->queue_day_id);
        $count = $this->conversionService->convertForDate($request->date, $queueDay, $request->user());

        return response()->json([
            'message'          => "Successfully converted {$count} booking(s) into queue items.",
            'converted_count'  => $count,
        ]);
    }

    /**
     * GET /api/v1/bookings/stats
     * Dashboard statistics for bookings
     */
    public function stats(Request $request): JsonResponse
    {
        $date = $request->input('date', Carbon::tomorrow()->toDateString());

        $byStatus = Booking::forDate($date)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $totalActive = Booking::forDate($date)->active()->count();
        $convertedCount = Booking::forDate($date)->whereNotNull('converted_at')->count();
        $maxCapacity = (int) \App\Models\Setting::get('booking_max_per_day', 50);

        return response()->json([
            'date'            => $date,
            'max_capacity'    => $maxCapacity,
            'total_active'    => $totalActive,
            'available_slots' => max(0, $maxCapacity - $totalActive),
            'converted_count' => $convertedCount,
            'by_status'       => [
                'Pending'   => $byStatus[BookingStatus::PENDING->value] ?? 0,
                'Confirmed' => $byStatus[BookingStatus::CONFIRMED->value] ?? 0,
                'CheckedIn' => $byStatus[BookingStatus::CHECKED_IN->value] ?? 0,
                'Completed' => $byStatus[BookingStatus::COMPLETED->value] ?? 0,
                'Cancelled' => $byStatus[BookingStatus::CANCELLED->value] ?? 0,
                'NoShow'    => $byStatus[BookingStatus::NO_SHOW->value] ?? 0,
            ],
        ]);
    }
}
