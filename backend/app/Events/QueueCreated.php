<?php

namespace App\Events;

use App\Models\QueueItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function broadcastAs(): string
    {
        return 'QueueCreated';
    }

    public function __construct(public readonly QueueItem $queueItem) {}

    public function broadcastOn(): array
    {
        $channels = [
            new Channel('queue.' . $this->queueItem->queue_day_id),
        ];

        if ($this->queueItem->queueDay?->doctor_id) {
            $channels[] = new Channel('tv.' . $this->queueItem->queueDay->doctor_id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'queue_item' => [
                'id'               => $this->queueItem->id,
                'serial_no'        => $this->queueItem->serial_no,
                'appointment_type' => $this->queueItem->appointment_type,
                'status'           => $this->queueItem->status,
                'priority'         => $this->queueItem->priority,
                'estimated_wait'   => $this->queueItem->estimated_wait,
                'called_at'        => $this->queueItem->called_at?->toIso8601String(),
                'patient'          => $this->queueItem->patient ? [
                    'id'    => $this->queueItem->patient->id,
                    'name'  => $this->queueItem->patient->name,
                    'phone' => $this->queueItem->patient->phone,
                ] : null,
            ],
        ];
    }
}
