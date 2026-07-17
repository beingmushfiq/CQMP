<?php

namespace App\Events;

use App\Models\QueueItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueCompleted implements ShouldBroadcast
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
            'queue_item_id' => $this->queueItem->id,
            'serial_no'     => $this->queueItem->serial_no,
            'completed_at'  => $this->queueItem->completed_at?->toIso8601String(),
        ];
    }
}
