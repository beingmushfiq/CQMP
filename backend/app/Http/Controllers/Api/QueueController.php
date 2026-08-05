<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\QueueItemResource;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\QueueItem;
use App\Services\AuditService;
use App\Services\QueueEngine;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;

class QueueController extends Controller
{
    public function __construct(
        private readonly QueueEngine $queue,
        private readonly AuditService $audit,
        private readonly \App\Services\BookingConversionService $bookingConversion
    ) {}

    /**
     * GET /api/v1/queue/today?doctor_id=1
     */
    public function today(Request $request): JsonResponse
    {
        $request->validate(['doctor_id' => ['required', 'exists:doctors,id']]);

        $queueDay = QueueDay::with(['items.patient'])
            ->where('doctor_id', $request->doctor_id)
            ->where('date', '>=', Carbon::today()->startOfDay())
            ->where('date', '<=', Carbon::today()->endOfDay())
            ->latest()
            ->first();

        if (! $queueDay) {
            return response()->json(['queue_day' => null, 'items' => []]);
        }

        return response()->json([
            'queue_day' => [
                'id'        => $queueDay->id,
                'status'    => $queueDay->status,
                'date'      => Carbon::parse($queueDay->date)->toDateString(),
                'opened_at' => $queueDay->opened_at?->toIso8601String(),
            ],
            'items' => QueueItemResource::collection(
                $queueDay->items()->with('patient')->orderBy('serial_no')->get()
            ),
        ]);
    }

    /**
     * POST /api/v1/queue/open
     */
    public function open(Request $request): JsonResponse
    {
        $request->validate(['doctor_id' => ['required', 'exists:doctors,id']]);
        $doctor   = Doctor::findOrFail($request->doctor_id);
        $todayStr = Carbon::today()->toDateString();
        $queueDay = $this->queue->openQueue($doctor, $todayStr);

        // Auto-convert any confirmed bookings for today into queue items
        $convertedCount = $this->bookingConversion->convertForDate($todayStr, $queueDay, $request->user());

        $this->audit->log('queue.opened', targetPatientId: null, details: "Doctor: {$doctor->name}. Converted bookings: {$convertedCount}", request: $request);
        return response()->json([
            'queue_day_id'      => $queueDay->id,
            'status'            => $queueDay->status,
            'converted_bookings' => $convertedCount,
        ]);
    }

    /**
     * POST /api/v1/queue/create
     * Accepts optional serial_no for custom insertion.
     */
    public function create(Request $request): QueueItemResource
    {
        $data = $request->validate([
            'queue_day_id' => ['required', 'exists:queue_days,id'],
            'patient_id'   => ['required', 'exists:patients,id'],
            'serial_no'    => ['nullable', 'integer', 'min:1'],
            'priority'     => ['nullable', 'string', 'in:Normal,Emergency,Reserved'],
        ]);

        $queueDay = QueueDay::findOrFail($data['queue_day_id']);
        $patient  = Patient::findOrFail($data['patient_id']);

        if ($patient->is_blocked) {
            abort(403, 'Patient is blocked: ' . $patient->blocked_reason);
        }

        $priority = $data['priority'] ?? 'Normal';
        $item = $this->queue->createWalkIn($queueDay, $patient, $priority, $data['serial_no'] ?? null);
        $this->audit->log('queue.walkin_created', targetPatientId: $patient->id, request: $request);

        return new QueueItemResource($item->load('patient'));
    }

    /**
     * POST /api/v1/queue/call-next
     */
    public function callNext(Request $request): JsonResponse
    {
        $request->validate(['queue_day_id' => ['required', 'exists:queue_days,id']]);
        $queueDay = QueueDay::findOrFail($request->queue_day_id);
        $item     = $this->queue->callNext($queueDay);

        if (! $item) {
            return response()->json(['message' => 'No more patients in queue.'], 200);
        }

        $this->audit->log('queue.called_next', targetPatientId: $item->patient_id, request: $request);
        return response()->json(['queue_item' => new QueueItemResource($item)]);
    }

    /**
     * POST /api/v1/queue/complete
     */
    public function complete(Request $request): QueueItemResource
    {
        $request->validate(['queue_item_id' => ['required', 'exists:queue_items,id']]);
        $item = QueueItem::findOrFail($request->queue_item_id);
        $item = $this->queue->complete($item);
        $this->audit->log('queue.completed', targetPatientId: $item->patient_id, request: $request);
        return new QueueItemResource($item);
    }

    /**
     * POST /api/v1/queue/skip
     */
    public function skip(Request $request): QueueItemResource
    {
        $request->validate(['queue_item_id' => ['required', 'exists:queue_items,id']]);
        $item = QueueItem::findOrFail($request->queue_item_id);
        $item = $this->queue->skip($item);
        $this->audit->log('queue.skipped', targetPatientId: $item->patient_id, request: $request);
        return new QueueItemResource($item);
    }

    /**
     * POST /api/v1/queue/reinsert
     */
    public function reinsert(Request $request): QueueItemResource
    {
        $data = $request->validate([
            'queue_item_id' => ['required', 'exists:queue_items,id'],
            'position'      => ['required', 'integer', 'min:1'],
        ]);

        $item = QueueItem::findOrFail($data['queue_item_id']);
        $item = $this->queue->reinsert($item, $data['position']);
        $this->audit->log('queue.reinserted', targetPatientId: $item->patient_id,
            details: "Position: {$data['position']}", request: $request);

        return new QueueItemResource($item);
    }

    /**
     * POST /api/v1/queue/emergency
     */
    public function emergency(Request $request): QueueItemResource
    {
        $data = $request->validate([
            'queue_day_id' => ['required', 'exists:queue_days,id'],
            'patient_id'   => ['required', 'exists:patients,id'],
        ]);

        $queueDay = QueueDay::findOrFail($data['queue_day_id']);
        $patient  = Patient::findOrFail($data['patient_id']);
        $item = $this->queue->insertEmergency($queueDay, $patient);
        $this->audit->log('queue.emergency_inserted', targetPatientId: $patient->id, request: $request);

        return new QueueItemResource($item->load('patient'));
    }

    /**
     * DELETE /api/v1/queue/{queueItem}
     * Delete a queue entry (receptionist only).
     */
    public function destroy(QueueItem $queueItem): JsonResponse
    {
        $this->audit->log('queue.deleted', targetPatientId: $queueItem->patient_id,
            details: "Serial: {$queueItem->serial_no}");
        $this->queue->deleteItem($queueItem);
        return response()->json(['message' => 'Queue entry deleted.']);
    }

    /**
     * POST /api/v1/queue/freeze
     */
    public function freeze(Request $request): JsonResponse
    {
        $request->validate(['queue_day_id' => ['required', 'exists:queue_days,id']]);
        $queueDay = QueueDay::findOrFail($request->queue_day_id);
        $this->queue->freeze($queueDay);
        $this->audit->log('queue.frozen', request: $request);
        return response()->json(['status' => 'paused']);
    }

    /**
     * POST /api/v1/queue/resume
     */
    public function resume(Request $request): JsonResponse
    {
        $request->validate(['queue_day_id' => ['required', 'exists:queue_days,id']]);
        $queueDay = QueueDay::findOrFail($request->queue_day_id);
        $this->queue->resume($queueDay);
        $this->audit->log('queue.resumed', request: $request);
        return response()->json(['status' => 'opened']);
    }

    /**
     * POST /api/v1/queue/clear
     */
    public function clear(Request $request): JsonResponse
    {
        $data = $request->validate([
            'queue_day_id' => ['required', 'exists:queue_days,id'],
            'target'       => ['required', 'string', 'in:all,waiting,completed,skipped'],
        ]);

        $queueDay = QueueDay::findOrFail($data['queue_day_id']);
        $this->queue->clearQueue($queueDay, $data['target']);
        $this->audit->log('queue.cleared', details: "Target: {$data['target']}", request: $request);

        return response()->json(['message' => "Queue cleared for target: {$data['target']}."]);
    }

    /**
     * POST /api/v1/queue/close
     */
    public function close(Request $request): JsonResponse
    {
        $request->validate(['queue_day_id' => ['required', 'exists:queue_days,id']]);
        $queueDay = QueueDay::findOrFail($request->queue_day_id);
        $this->queue->closeQueue($queueDay);
        $this->audit->log('queue.closed', request: $request);

        return response()->json(['status' => 'closed', 'message' => 'Queue session closed for today.']);
    }


    /**
     * POST /api/v1/doctor/delay
     */
    public function updateDelay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id'     => ['required', 'exists:doctors,id'],
            'delay_minutes' => ['required', 'integer', 'min:0'],
        ]);

        \App\Models\DoctorDelay::where('doctor_id', $data['doctor_id'])
            ->whereNull('end_time')
            ->update(['end_time' => now()]);

        if ($data['delay_minutes'] > 0) {
            \App\Models\DoctorDelay::create([
                'doctor_id'     => $data['doctor_id'],
                'delay_minutes' => $data['delay_minutes'],
                'start_time'    => now(),
                'reason'        => 'Doctor chamber delay',
            ]);
        }

        $queueDay = QueueDay::where('doctor_id', $data['doctor_id'])
            ->where('date', '>=', Carbon::today()->startOfDay())
            ->where('date', '<=', Carbon::today()->endOfDay())
            ->latest()->first();

        if ($queueDay) {
            $this->queue->recalculateWaitTimes($queueDay);
        }

        return response()->json(['message' => 'Delay updated successfully.']);
    }

    /**
     * GET /api/v1/public/doctors
     * List of available doctors (public, no auth).
     * Cached for 60 seconds — doctor list rarely changes mid-session
     * and this endpoint is polled by every TV display + visitor page.
     */
    public function publicDoctors(): JsonResponse
    {
        $doctors = Cache::remember('public.doctors', 60, fn() =>
            Doctor::where('is_available', true)->get(['id', 'name', 'specialization'])
        );

        return response()->json($doctors);
    }

    /**
     * GET /api/v1/public/queue?doctor_id=1
     * Read-only queue view — no auth required.
     * Used by the TV display when accessed without a staff login.
     * Only exposes display-safe fields: serial_no, status, patient name.
     */
    public function publicQueue(Request $request): JsonResponse
    {
        $request->validate(['doctor_id' => ['required', 'exists:doctors,id']]);

        /** @var QueueDay|null $queueDay */
        $queueDay = QueueDay::where('doctor_id', $request->doctor_id)
            ->where('date', '>=', Carbon::today()->startOfDay())
            ->where('date', '<=', Carbon::today()->endOfDay())
            ->latest()
            ->first();

        if (! $queueDay) {
            return response()->json(['queue_day' => null, 'items' => []]);
        }

        $items = $queueDay->items()
            ->with('patient:id,name')
            ->whereIn('status', ['Waiting', 'Called'])
            ->orderBy('serial_no')
            ->get()
            ->map(fn($item) => [
                'id'             => $item->id,
                'serial_no'      => $item->serial_no,
                'status'         => $item->status,
                'priority'       => $item->priority,
                'estimated_wait' => $item->estimated_wait,
                'called_at'      => $item->called_at?->toIso8601String(),
                'patient'        => ['id' => $item->patient->id, 'name' => $item->patient->name],
            ]);

        return response()->json([
            'queue_day' => [
                'id'        => $queueDay->id,
                'status'    => $queueDay->status,
                'date'      => Carbon::parse($queueDay->date)->toDateString(),
                'opened_at' => $queueDay->opened_at?->toIso8601String(),
            ],
            'items' => $items,
        ]);
    }

    /**
     * POST /api/v1/public/book
     * Visitor self-booking — no auth required.
     */
    public function publicBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\pL\s\.\-]+$/u'],
            'phone'     => ['nullable', 'string', 'max:15', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'doctor_id' => ['required', 'exists:doctors,id'],
        ]);

        // De-duplicate by phone if provided (updating name to current input); otherwise create fresh record by name
        if (!empty($data['phone'])) {
            $patient = Patient::updateOrCreate(
                ['phone' => $data['phone']],
                ['name'  => $data['name']]
            );
        } else {
            $patient = Patient::create([
                'name'  => $data['name'],
                'phone' => null,
            ]);
        }

        if ($patient->is_blocked) {
            abort(403, 'Patient is blocked and cannot book.');
        }

        $queueDay = QueueDay::where('doctor_id', $data['doctor_id'])
            ->where('date', '>=', Carbon::today()->startOfDay())
            ->where('date', '<=', Carbon::today()->endOfDay())
            ->latest()->first();

        if (! $queueDay) {
            $doctor = Doctor::findOrFail($data['doctor_id']);
            $queueDay = QueueDay::create([
                'doctor_id' => $doctor->id,
                'clinic_id' => $doctor->clinic_id,
                'date'      => Carbon::today()->toDateString(),
                'status'    => 'opened',
                'opened_at' => Carbon::now(),
            ]);
        } elseif ($queueDay->status === 'closed') {
            return response()->json([
                'message' => 'The queue for this doctor is closed for today.',
            ], 422);
        }

        $item = $this->queue->createWalkIn($queueDay, $patient, 'Normal');

        return response()->json([
            'message'   => 'Booking successful! Your serial number is #' . $item->serial_no,
            'serial_no' => $item->serial_no,
            'patient'   => ['name' => $patient->name, 'phone' => $patient->phone],
        ]);
    }
}
