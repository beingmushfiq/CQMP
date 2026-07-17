<?php

namespace App\Events;

use App\Models\QueueItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmergencyInserted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly QueueItem $queueItem) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('queue.' . $this->queueItem->queue_day_id),
            new Channel('tv.' . $this->queueItem->queueDay->doctor_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'queue_item' => [
                'id'        => $this->queueItem->id,
                'serial_no' => $this->queueItem->serial_no,
                'priority'  => $this->queueItem->priority,
                'status'    => $this->queueItem->status,
                'patient'   => [
                    'id'    => $this->queueItem->patient->id,
                    'name'  => $this->queueItem->patient->name,
                    'phone' => $this->queueItem->patient->phone,
                ],
            ],
        ];
    }
}
