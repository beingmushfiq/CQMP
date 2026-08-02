<?php

namespace App\Services;

use App\Models\AnnouncementLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class AnnouncementService
{
    public function announce(array $payload, ?User $actor = null): AnnouncementLog
    {
        $type         = $payload['type'] ?? 'custom';
        $priority     = (int) ($payload['priority'] ?? 8);
        $serialNo     = $payload['serial_no'] ?? null;
        $patientId    = $payload['patient_id'] ?? null;
        $textBn       = $payload['text_bn'] ?? null;
        $textEn       = $payload['text_en'] ?? null;
        $languageMode = Setting::get('audio_language_mode', 'both');

        $log = AnnouncementLog::create([
            'type'           => $type,
            'priority'       => $priority,
            'patient_id'     => $patientId,
            'serial_no'      => $serialNo,
            'text_bn'        => $textBn,
            'text_en'        => $textEn,
            'language_mode'  => $languageMode,
            'voice_provider' => Setting::get('audio_voice_provider', 'web_speech'),
            'status'         => 'queued',
            'played_by'      => $actor?->id,
            'metadata'       => $payload['metadata'] ?? null,
        ]);

        $broadcastData = [
            'id'            => $log->id,
            'type'          => $type,
            'priority'      => $priority,
            'serial_no'     => $serialNo,
            'patient_name'  => $payload['patient_name'] ?? null,
            'text_bn'       => $textBn,
            'text_en'       => $textEn,
            'language_mode' => $languageMode,
            'repeat_count'  => (int) Setting::get('audio_repeat_count', 3),
            'repeat_delay'  => (int) Setting::get('audio_repeat_delay', 3500),
            'timestamp'     => now()->toIso8601String(),
        ];

        $this->broadcast('announcement.created', $broadcastData);

        return $log;
    }

    private function broadcast(string $event, array $data): void
    {
        try {
            $nodeWsUrl = rtrim(env('NODE_WS_URL', 'http://127.0.0.1:3001'), '/');
            Http::timeout(3)->post("{$nodeWsUrl}/broadcast", [
                'channel' => 'announcements',
                'event'   => $event,
                'data'    => $data,
            ]);
        } catch (\Throwable) {
            // Best effort
        }
    }
}
