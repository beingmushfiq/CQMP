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

class QueueController extends Controller
{
    public function __construct(
        private readonly QueueEngine $queue,
        private readonly AuditService $audit
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
        $queueDay = $this->queue->openQueue($doctor, Carbon::today()->toDateString());
        $this->audit->log('queue.opened', targetPatientId: null, details: "Doctor: {$doctor->name}", request: $request);
        return response()->json(['queue_day_id' => $queueDay->id, 'status' => $queueDay->status]);
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
     */
    public function publicDoctors(): JsonResponse
    {
        $doctors = Doctor::where('is_available', true)->get(['id', 'name', 'specialization']);
        return response()->json($doctors);
    }

    /**
     * POST /api/v1/public/book
     * Visitor self-booking — no auth required.
     */
    public function publicBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'doctor_id' => ['required', 'exists:doctors,id'],
        ]);

        // De-duplicate by phone if provided; otherwise create fresh record by name
        if (!empty($data['phone'])) {
            $patient = Patient::firstOrCreate(
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
            ->where('status', 'opened')
            ->latest()->first();

        if (! $queueDay) {
            return response()->json([
                'message' => 'No open queue for this doctor today. Please visit the reception desk.',
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
