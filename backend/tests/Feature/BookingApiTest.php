<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_booking_creation_creates_booking_record(): void
    {
        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $response = $this->postJson('/api/v1/public/bookings', [
            'doctor_id' => $doctor->id,
            'patient_name' => 'Test Patient',
            'patient_phone' => '01712345678',
            'patient_type' => 'New',
            'booking_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Booking created successfully!');

        $this->assertDatabaseHas('bookings', [
            'doctor_id' => $doctor->id,
            'patient_name' => 'Test Patient',
            'patient_phone' => '01712345678',
        ]);
    }

    public function test_can_delete_booking(): void
    {
        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        \Spatie\Permission\Models\Role::create(['name' => 'Receptionist']);
        $user = User::factory()->create();
        $user->assignRole('Receptionist');

        $booking = Booking::create([
            'booking_number' => 'BK-TEST-001',
            'doctor_id'      => $doctor->id,
            'patient_name'   => 'Test Patient',
            'patient_phone'  => '01712345678',
            'patient_type'   => 'New',
            'booking_date'   => Carbon::tomorrow()->toDateString(),
            'status'         => 'Pending',
        ]);

        $this->actingAsJwt($user)
             ->deleteJson("/api/v1/bookings/{$booking->id}")
             ->assertStatus(200)
             ->assertJson(['message' => 'Booking deleted successfully.']);

        $this->assertDatabaseMissing('bookings', [
            'id' => $booking->id,
        ]);
    }
}
