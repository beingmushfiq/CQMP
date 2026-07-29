<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /**
     * GET /api/v1/settings — Return all settings as key-value pairs.
     */
    public function index(): JsonResponse
    {
        return response()->json(Setting::allAsArray());
    }

    /**
     * GET /api/v1/settings/public — Return public settings (no auth needed).
     */
    public function publicSettings(): JsonResponse
    {
        $publicKeys = [
            'site_title', 'site_subtitle', 'logo_path', 'favicon_path',
            'doctor_name', 'doctor_specialization', 'doctor_image',
        ];

        return response()->json(
            Setting::whereIn('key', $publicKeys)->pluck('value', 'key')->toArray()
        );
    }

    /**
     * PUT /api/v1/settings — Update settings (Super Admin only).
     */
    public function update(Request $request): JsonResponse
    {
        $settings = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable', 'string'],
        ]);

        foreach ($settings['settings'] as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(Setting::allAsArray());
    }

    /**
     * POST /api/v1/settings/upload — Upload logo or favicon.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:4096'],
            'type' => ['required', 'in:logo,favicon,doctor_image'],
        ]);

        $file = $request->file('file');
        $path = $file->store('settings', 'public');
        $keyMap = ['logo' => 'logo_path', 'favicon' => 'favicon_path', 'doctor_image' => 'doctor_image'];
        $key = $keyMap[$request->type];

        // Delete old file if exists
        $oldPath = Setting::get($key);
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        Setting::set($key, $path);

        return response()->json([
            'key'   => $key,
            'path'  => $path,
            'url'   => '/storage/' . $path,
        ]);
    }
}
