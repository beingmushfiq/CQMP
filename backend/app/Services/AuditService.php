<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public function log(
        string $action,
        ?int $userId = null,
        ?string $userType = null,
        ?int $targetPatientId = null,
        ?string $details = null,
        ?Request $request = null
    ): AuditLog {
        return AuditLog::create([
            'user_id'           => $userId ?? auth()->id(),
            'user_type'         => $userType ?? (auth()->user()?->getRoleNames()->first() ?? 'System'),
            'action'            => $action,
            'target_patient_id' => $targetPatientId,
            'details'           => $details,
            'ip_address'        => $request?->ip(),
            'user_agent'        => $request?->userAgent(),
            'timestamp'         => now(),
        ]);
    }
}
