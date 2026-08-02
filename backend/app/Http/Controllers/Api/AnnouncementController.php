<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementLog;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function __construct(
        private readonly AnnouncementService $service
    ) {}

    public function custom(Request $request): JsonResponse
    {
        $request->validate([
            'text_bn'   => ['required_without:text_en', 'nullable', 'string', 'max:500'],
            'text_en'   => ['required_without:text_bn', 'nullable', 'string', 'max:500'],
            'priority'  => ['nullable', 'integer', 'between:1,9'],
            'serial_no' => ['nullable', 'integer'],
        ]);

        $log = $this->service->announce([
            'type'      => 'custom',
            'priority'  => $request->input('priority', 8),
            'serial_no' => $request->serial_no,
            'text_bn'   => $request->text_bn,
            'text_en'   => $request->text_en,
        ], $request->user());

        return response()->json(['message' => 'Custom announcement dispatched.', 'log' => $log], 201);
    }

    public function test(Request $request): JsonResponse
    {
        $log = $this->service->announce([
            'type'     => 'speaker_test',
            'priority' => 8,
            'text_bn'  => 'শব্দ পরীক্ষা সফল হয়েছে। লাউডস্পিকার সঠিকভাবে কাজ করছে।',
            'text_en'  => 'Speaker test successful. Audio output is functioning normally.',
        ], $request->user());

        return response()->json(['message' => 'Test announcement dispatched.', 'log' => $log]);
    }

    public function logs(Request $request): JsonResponse
    {
        $logs = AnnouncementLog::with('playedBy')
            ->latest()
            ->paginate($request->input('per_page', 20));

        return response()->json($logs);
    }
}
