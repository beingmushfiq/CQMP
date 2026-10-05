<?php

namespace App\Services;

use App\Enums\DisplayMode;
use App\Models\DisplayState;
use App\Helpers\NodeBroadcaster;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class DisplayStateService
{
    /**
     * Get the current active display state, or initialize to NORMAL if empty.
     */
    public function getCurrentState(): DisplayState
    {
        $state = DisplayState::with('activatedBy')->first();

        if (!$state) {
            $state = DisplayState::create([
                'mode' => DisplayMode::NORMAL->value,
                'activated_at' => Carbon::now(),
            ]);
        }

        return $state;
    }

    /**
     * Transition the display to a new mode.
     */
    public function transitionTo(DisplayMode $mode, array $payload = []): DisplayState
    {
        $state = $this->getCurrentState();

        $defaultTitles = [
            DisplayMode::BREAK->value => [
                'title_bn' => 'বিরতি চলছে',
                'title_en' => 'Doctor is on Break',
            ],
            DisplayMode::REPORT->value => [
                'title_bn' => 'রিপোর্ট দেখা হচ্ছে',
                'title_en' => 'Doctor is Reviewing Reports',
            ],
            DisplayMode::FOLLOW_UP->value => [
                'title_bn' => 'ফলো-আপ রোগী দেখা হচ্ছে',
                'title_en' => 'Doctor is Attending Follow-Up Patients',
                'message_bn' => 'অনুগ্রহ করে অপেক্ষা করুন',
                'message_en' => 'Please wait for your turn...',
            ],
            DisplayMode::EMERGENCY->value => [
                'title_bn' => 'জরুরী রোগী দেখা হচ্ছে',
                'title_en' => 'Emergency Patient',
            ],
        ];

        $defaults = $defaultTitles[$mode->value] ?? [];

        $state->update([
            'mode' => $mode->value,
            'title_bn' => $payload['title_bn'] ?? $defaults['title_bn'] ?? null,
            'title_en' => $payload['title_en'] ?? $defaults['title_en'] ?? null,
            'message_bn' => $payload['message_bn'] ?? $defaults['message_bn'] ?? null,
            'message_en' => $payload['message_en'] ?? $defaults['message_en'] ?? null,
            'resume_at' => isset($payload['resume_at']) ? Carbon::parse($payload['resume_at']) : null,
            'activated_by' => Auth::id(),
            'activated_at' => Carbon::now(),
            'metadata' => $payload['metadata'] ?? null,
        ]);

        $state->load('activatedBy');

        // Broadcast the update immediately via NodeBroadcaster for low latency Socket.IO syncing
        $broadcastPayload = [
            'mode' => $state->mode,
            'title_bn' => $state->title_bn,
            'title_en' => $state->title_en,
            'message_bn' => $state->message_bn,
            'message_en' => $state->message_en,
            'resume_time' => $state->resume_at?->toIso8601String(),
            'activated_by' => $state->activatedBy?->name ?? 'System',
            'timestamp' => $state->activated_at?->toIso8601String(),
        ];

        if ($mode === DisplayMode::NORMAL) {
            NodeBroadcaster::broadcast('display.mode.resumed', $broadcastPayload);
        } else {
            NodeBroadcaster::broadcast('display.mode.changed', $broadcastPayload);
        }

        return $state;
    }

    /**
     * Helper to resume to NORMAL.
     */
    public function resumeNormal(): DisplayState
    {
        return $this->transitionTo(DisplayMode::NORMAL);
    }
}
