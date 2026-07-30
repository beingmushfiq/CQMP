<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public function log(
        string $action,
        ?int $userId = null,
        ?string $userType = null,
        ?int $targetPatientId = null,
        ?string $details = null,
        ?Request $request = null
    ): ?AuditLog {
        try {
            $authUser = Auth::user();
            $resolvedUserType = $userType ?? (
                $authUser instanceof User
                    ? (rescue(fn() => $authUser->getRoleNames()->first(), report: false) ?? 'System')
                    : 'System'
            );

            return AuditLog::create([
                'user_id'           => $userId ?? Auth::id(),
                'user_type'         => $resolvedUserType,
                'action'            => $action,
                'target_patient_id' => $targetPatientId,
                'details'           => $details,
                'ip_address'        => $request?->ip(),
                'user_agent'        => $request?->userAgent(),
                'timestamp'         => now(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("AuditLog creation failed: {$e->getMessage()}");
            return null;
        }
    }
}
