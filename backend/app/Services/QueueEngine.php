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

        broadcast(new QueueOpened($queueDay))->toOthers();

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
            broadcast(new QueueCreated($item))->toOthers();

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
            broadcast(new QueueUpdated($nextItem))->toOthers();

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
            broadcast(new QueueCompleted($item))->toOthers();
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
            broadcast(new QueueUpdated($item))->toOthers();
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
                broadcast(new QueueUpdated($it));
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
            broadcast(new EmergencyInserted($item))->toOthers();
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
        broadcast(new QueueFrozen($queueDay))->toOthers();
        return $queueDay;
    }

    /**
     * Resume a frozen queue.
     */
    public function resume(QueueDay $queueDay): QueueDay
    {
        $queueDay->update(['status' => 'opened']);
        broadcast(new QueueResumed($queueDay))->toOthers();
        return $queueDay;
    }

    /**
     * Recalculate estimated wait times for all Waiting items in a queue day.
     * Formula: EWT = avg_consultation_time * position_in_queue + active_delay
     */
    public function recalculateWaitTimes(QueueDay $queueDay): void
    {
        $avgTime = $queueDay->doctor->average_consultation_time;

        // Get active delay for this doctor
        $activeDelay = \App\Models\DoctorDelay::where('doctor_id', $queueDay->doctor_id)
            ->whereNull('end_time')
            ->value('delay_minutes') ?? 0;

        $waitingItems = QueueItem::where('queue_day_id', $queueDay->id)
            ->where('status', 'Waiting')
            ->orderBy('priority', 'desc')
            ->orderBy('serial_no')
            ->get();

        $waitTimes = [];
        $position = 1;

        foreach ($waitingItems as $item) {
            $ewt = ($avgTime * $position) + $activeDelay;
            $item->update(['estimated_wait' => $ewt]);
            $waitTimes[$item->id] = $ewt;
            $position++;
        }

        if (!empty($waitTimes)) {
            broadcast(new EstimatedTimeUpdated($queueDay, $waitTimes))->toOthers();
        }
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

            broadcast(new QueueDeleted($itemId, $queueDayId, $doctorId))->toOthers();
        });
    }
}
