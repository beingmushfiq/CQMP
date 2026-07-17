<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientController extends Controller
{
    /**
     * GET /api/v1/patients?search=name_or_phone
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Patient::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return PatientResource::collection($query->latest()->paginate(20));
    }

    /**
     * POST /api/v1/patients
     */
    public function store(Request $request): PatientResource
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
        ]);

        // If phone is provided, de-duplicate by phone number.
        // Otherwise, always create a new record keyed by name.
        if (!empty($data['phone'])) {
            $patient = Patient::firstOrCreate(
                ['phone' => $data['phone']],
                ['name'  => $data['name']]
            );
        } else {
            $patient = Patient::create([
                'name'  => $data['name'],
                'phone' => null,
            ]);
        }

        return new PatientResource($patient);
    }

    /**
     * GET /api/v1/patients/{patient}
     */
    public function show(Patient $patient): PatientResource
    {
        return new PatientResource($patient);
    }

    /**
     * PUT /api/v1/patients/{patient}
     */
    public function update(Request $request, Patient $patient): PatientResource
    {
        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'phone'          => ['sometimes', 'string', 'max:20'],
            'notes'          => ['nullable', 'string'],
            'is_blocked'     => ['sometimes', 'boolean'],
            'blocked_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $patient->update($data);

        return new PatientResource($patient);
    }

    /**
     * DELETE /api/v1/patients/{patient}
     */
    public function destroy(Patient $patient): JsonResponse
    {
        $patient->delete();
        return response()->json(['message' => 'Patient deleted.']);
    }
}
