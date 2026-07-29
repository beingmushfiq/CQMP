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
    ): AuditLog {
        // Narrow Auth::user() from Authenticatable|null → User to access
        // the Spatie HasRoles trait method getRoleNames().
        // Auth::user() is typed as Authenticatable|null which doesn't
        // declare getRoleNames() — instanceof narrows it for the analyser.
        $authUser = Auth::user();
        $resolvedUserType = $userType ?? (
            $authUser instanceof User
                ? ($authUser->getRoleNames()->first() ?? 'System')
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
    }
}
