<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'phone'          => $this->phone,
            'notes'          => $this->notes,
            'is_blocked'     => $this->is_blocked,
            'blocked_reason' => $this->blocked_reason,
            'qr_identifier'  => $this->qr_identifier,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
