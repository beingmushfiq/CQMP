<?php

namespace App\Events;

use App\Models\QueueDay;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueOpened implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly QueueDay $queueDay) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('doctor-queue.' . $this->queueDay->doctor_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'queue_day' => [
                'id'        => $this->queueDay->id,
                'status'    => $this->queueDay->status,
                'date'      => \Carbon\Carbon::parse($this->queueDay->date)->toDateString(),
                'opened_at' => $this->queueDay->opened_at?->toIso8601String(),
            ],
        ];
    }
}
