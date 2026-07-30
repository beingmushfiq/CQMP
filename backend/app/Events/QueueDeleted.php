<?php

namespace App\Events;

use App\Models\QueueItem;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function broadcastAs(): string
    {
        return 'QueueDeleted';
    }

    public function __construct(
        public readonly int $queueItemId,
        public readonly int $queueDayId,
        public readonly int $doctorId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('queue.' . $this->queueDayId),
            new Channel('tv.' . $this->doctorId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'queue_item_id' => $this->queueItemId,
        ];
    }
}
