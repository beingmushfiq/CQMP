<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QueueItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'serial_no'        => $this->serial_no,
            'appointment_type' => $this->appointment_type,
            'status'           => $this->status,
            'priority'         => $this->priority,
            'estimated_wait'   => $this->estimated_wait,
            'called_at'        => $this->called_at?->toIso8601String(),
            'completed_at'     => $this->completed_at?->toIso8601String(),
            'remarks'          => $this->remarks,
            'patient'          => $this->whenLoaded('patient', fn() => [
                'id'    => $this->patient->id,
                'name'  => $this->patient->name,
                'phone' => $this->patient->phone,
            ]),
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
