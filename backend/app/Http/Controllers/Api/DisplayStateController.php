<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\DisplayMode;
use App\Services\DisplayStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class DisplayStateController extends Controller
{
    public function __construct(private readonly DisplayStateService $service) {}

    /**
     * GET /api/v1/display/mode
     * Retrieve the current display mode & active state. Accessible by everyone (public).
     */
    public function show(): JsonResponse
    {
        $state = $this->service->getCurrentState();
        return response()->json([
            'mode' => $state->mode,
            'title_bn' => $state->title_bn,
            'title_en' => $state->title_en,
            'message_bn' => $state->message_bn,
            'message_en' => $state->message_en,
            'resume_time' => $state->resume_at?->toIso8601String(),
            'activated_by' => $state->activatedBy?->name ?? 'System',
            'timestamp' => $state->activated_at?->toIso8601String(),
            'metadata' => $state->metadata,
        ]);
    }

    /**
     * POST /api/v1/display/mode
     * Transition the display to a new mode. Restricted by role checks.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => ['required', new Enum(DisplayMode::class)],
            'title_bn' => ['nullable', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'message_bn' => ['nullable', 'string'],
            'message_en' => ['nullable', 'string'],
            'resume_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ]);

        $mode = DisplayMode::from($request->mode);
        $user = $request->user();

        // Role Permission Guard:
        // - Doctor / Receptionist: Can activate BREAK, REPORT, NORMAL. Cannot activate EMERGENCY.
        // - Super Admin: Can activate all modes (including EMERGENCY).
        if ($mode === DisplayMode::EMERGENCY && !$user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized. Only Super Admin can activate EMERGENCY mode.'], 403);
        }

        $state = $this->service->transitionTo($mode, $request->only([
            'title_bn', 'title_en', 'message_bn', 'message_en', 'resume_at', 'metadata'
        ]));

        return response()->json([
            'message' => "Display mode updated to {$state->mode}.",
            'state' => $state
        ]);
    }

    /**
     * POST /api/v1/display/resume
     * Quick action to resume to NORMAL.
     */
    public function resume(): JsonResponse
    {
        $state = $this->service->resumeNormal();
        return response()->json([
            'message' => 'Display mode resumed to NORMAL.',
            'state' => $state
        ]);
    }
}
