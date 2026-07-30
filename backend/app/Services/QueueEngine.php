<?php

namespace App\Services;

use App\Events\EmergencyInserted;
use App\Events\EstimatedTimeUpdated;
use App\Events\QueueCompleted;
use App\Events\QueueCreated;
use App\Events\QueueFrozen;
use App\Events\QueueResumed;
use App\Events\QueueUpdated;
use App\Events\QueueOpened;
use App\Events\QueueDeleted;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\QueueItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class QueueEngine
{
    /**
     * Open a new queue session for a doctor on a given date.
     */
    public function openQueue(Doctor $doctor, string $date): QueueDay
    {
        $carbonDate = Carbon::parse($date);
        $queueDay = QueueDay::where('doctor_id', $doctor->id)
            ->where('date', '>=', $carbonDate->copy()->startOfDay())
            ->where('date', '<=', $carbonDate->copy()->endOfDay())
            ->latest()
            ->first();

        if (! $queueDay) {
            $queueDay = QueueDay::create([
                'doctor_id'  => $doctor->id,
                'clinic_id'  => $doctor->clinic_id,
                'date'       => $date,
                'status'     => 'opened',
                'opened_by'  => \Illuminate\Support\Facades\Auth::id(),
                'opened_at'  => Carbon::now(),
            ]);
        }

        rescue(fn() => broadcast(new QueueOpened($queueDay)), report: false);

        return $queueDay;
    }

    /**
     * Create a walk-in queue item with atomic serial generation (DB lock).
     */
    public function createWalkIn(QueueDay $queueDay, Patient $patient, string $priority = 'Normal', ?int $customSerial = null): QueueItem
    {
        return DB::transaction(function () use ($queueDay, $patient, $priority, $customSerial) {
            // Lock the queue_day row to prevent race conditions
            $queueDay = QueueDay::lockForUpdate()->find($queueDay->id);

            if ($queueDay->status === 'paused') {
                abort(422, 'Queue is currently frozen. No new walk-ins allowed.');
            }

            if ($customSerial !== null) {
                $nextSerial = $customSerial;
                // Bump all items at or after customSerial to accommodate the insertion
                QueueItem::where('queue_day_id', $queueDay->id)
                    ->where('serial_no', '>=', $customSerial)
                    ->lockForUpdate()
                    ->increment('serial_no');
            } else {
                $nextSerial = QueueItem::where('queue_day_id', $queueDay->id)->max('serial_no') + 1;
            }

            $waitingCount = QueueItem::where('queue_day_id', $queueDay->id)
                ->where('status', 'Waiting')
                ->count();

            $estimatedWait = $waitingCount * $queueDay->doctor->average_consultation_time;

            $item = QueueItem::create([
                'queue_day_id'     => $queueDay->id,
                'patient_id'       => $patient->id,
                'serial_no'        => $nextSerial,
                'appointment_type' => 'Walk-in',
                'status'           => 'Waiting',
                'priority'         => $priority,
                'estimated_wait'   => $estimatedWait,
            ]);

            $item->load(['patient', 'queueDay']);
            rescue(fn() => broadcast(new QueueCreated($item)), report: false);

            return $item;
        });
    }

    /**
     * Call the next waiting patient.
     */
    public function callNext(QueueDay $queueDay): ?QueueItem
    {
        return DB::transaction(function () use ($queueDay) {
            // Mark currently called item as "Inside Chamber" (intermediate) if needed
            // For simplicity: move any currently Called item to waiting (will be handled by receptionist "complete")

            $nextItem = QueueItem::where('queue_day_id', $queueDay->id)
                ->where('status', 'Waiting')
                ->orderBy('priority', 'desc') // Emergency > Normal
                ->orderBy('serial_no')
                ->lockForUpdate()
                ->first();

            if (! $nextItem) {
                return null;
            }

            $nextItem->update([
                'status'    => 'Called',
                'called_at' => Carbon::now(),
            ]);

            $nextItem->load(['patient', 'queueDay']);
            rescue(fn() => broadcast(new QueueUpdated($nextItem)), report: false);

            return $nextItem;
        });
    }

    /**
     * Mark a queue item as completed.
     */
    public function complete(QueueItem $item): QueueItem
    {
        return DB::transaction(function () use ($item) {
            $item->update([
                'status'       => 'Completed',
                'completed_at' => Carbon::now(),
            ]);

            $item->load(['patient', 'queueDay']);
            rescue(fn() => broadcast(new QueueCompleted($item)), report: false);
            $this->recalculateWaitTimes($item->queueDay);

            return $item;
        });
    }

    /**
     * Mark a queue item as skipped.
     */
    public function skip(QueueItem $item): QueueItem
    {
        return DB::transaction(function () use ($item) {
            $item->update(['status' => 'Skipped']);
            $item->load(['patient', 'queueDay']);
            rescue(fn() => broadcast(new QueueUpdated($item)), report: false);
            $this->recalculateWaitTimes($item->queueDay);

            return $item;
        });
    }

    /**
     * Reinsert a skipped patient at a given position.
     */
    public function reinsert(QueueItem $item, int $position): QueueItem
    {
        return DB::transaction(function () use ($item, $position) {
            // Bump all items at or after target position
            QueueItem::where('queue_day_id', $item->queue_day_id)
                ->where('status', 'Waiting')
                ->where('serial_no', '>=', $position)
                ->lockForUpdate()
                ->increment('serial_no');

            $item->update([
                'status'    => 'Waiting',
                'serial_no' => $position,
            ]);

            // Broadcast updates for all affected waiting/called items in this queue day
            $allItems = QueueItem::where('queue_day_id', $item->queue_day_id)
                ->whereIn('status', ['Waiting', 'Called'])
                ->with(['patient', 'queueDay'])
                ->get();

            foreach ($allItems as $it) {
                rescue(fn() => broadcast(new QueueUpdated($it)), report: false);
            }

            $item->load(['patient', 'queueDay']);
            $this->recalculateWaitTimes($item->queueDay);

            return $item;
        });
    }

    /**
     * Insert an emergency patient at the front of the Waiting queue.
     */
    public function insertEmergency(QueueDay $queueDay, Patient $patient): QueueItem
    {
        return DB::transaction(function () use ($queueDay, $patient) {
            $queueDay = QueueDay::lockForUpdate()->find($queueDay->id);

            // Bump all waiting patients by 1
            QueueItem::where('queue_day_id', $queueDay->id)
                ->where('status', 'Waiting')
                ->lockForUpdate()
                ->increment('serial_no');

            $nextSerial = QueueItem::where('queue_day_id', $queueDay->id)->max('serial_no') + 1;

            $item = QueueItem::create([
                'queue_day_id'     => $queueDay->id,
                'patient_id'       => $patient->id,
                'serial_no'        => $nextSerial,
                'appointment_type' => 'Walk-in',
                'status'           => 'Waiting',
                'priority'         => 'Emergency',
                'estimated_wait'   => 0,
            ]);

            $item->load(['patient', 'queueDay']);
            rescue(fn() => broadcast(new EmergencyInserted($item)), report: false);
            $this->recalculateWaitTimes($queueDay);

            return $item;
        });
    }

    /**
     * Freeze (pause) the queue — no new walk-ins accepted.
     */
    public function freeze(QueueDay $queueDay): QueueDay
    {
        $queueDay->update(['status' => 'paused']);
        rescue(fn() => broadcast(new QueueFrozen($queueDay)), report: false);
        return $queueDay;
    }

    /**
     * Resume a frozen queue.
     */
    public function resume(QueueDay $queueDay): QueueDay
    {
        $queueDay->update(['status' => 'opened']);
        rescue(fn() => broadcast(new QueueResumed($queueDay)), report: false);
        return $queueDay;
    }

    /**
     * Recalculate estimated wait times for all Waiting items in a queue day.
     * Formula: EWT = avg_consultation_time * position_in_queue + active_delay
     *
     * Performance: Uses a single batch UPDATE instead of one UPDATE per patient.
     * For N waiting patients: was N+1 queries, now 2 queries (SELECT + 1 UPDATE).
     */
    public function recalculateWaitTimes(?QueueDay $queueDay): void
    {
        if (! $queueDay) {
            return;
        }

        $avgTime = $queueDay->doctor?->average_consultation_time ?? 15;

        // Get active delay for this doctor (single query)
        $activeDelay = \App\Models\DoctorDelay::where('doctor_id', $queueDay->doctor_id)
            ->whereNull('end_time')
            ->value('delay_minutes') ?? 0;

        $waitingItems = QueueItem::where('queue_day_id', $queueDay->id)
            ->where('status', 'Waiting')
            ->orderBy('priority', 'desc')
            ->orderBy('serial_no')
            ->get(['id', 'serial_no', 'priority']);

        if ($waitingItems->isEmpty()) {
            return;
        }

        $waitTimes = [];
        $position  = 1;

        foreach ($waitingItems as $item) {
            $ewt                  = ($avgTime * $position) + $activeDelay;
            $waitTimes[$item->id] = $ewt;
            $position++;
        }

        foreach ($waitingItems as $item) {
            QueueItem::where('id', $item->id)->update(['estimated_wait' => $waitTimes[$item->id]]);
        }

        rescue(fn() => broadcast(new EstimatedTimeUpdated($queueDay, $waitTimes)), report: false);
    }

    /**
     * Delete a queue item.
     */
    public function deleteItem(QueueItem $item): void
    {
        DB::transaction(function () use ($item) {
            $itemId = $item->id;
            $queueDayId = $item->queue_day_id;
            $doctorId = $item->queueDay->doctor_id;

            $item->delete();

            $queueDay = QueueDay::find($queueDayId);
            if ($queueDay) {
                $this->recalculateWaitTimes($queueDay);
            }

            rescue(fn() => broadcast(new QueueDeleted($itemId, $queueDayId, $doctorId)), report: false);
        });
    }
}
