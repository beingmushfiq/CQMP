<?php

namespace App\Events;

use App\Models\QueueDay;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EstimatedTimeUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly QueueDay $queueDay,
        public readonly array $waitTimes
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('queue.' . $this->queueDay->id),
            new Channel('tv.' . $this->queueDay->doctor_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'queue_day_id' => $this->queueDay->id,
            'wait_times'   => $this->waitTimes, // [queue_item_id => estimated_wait_minutes]
        ];
    }
}
