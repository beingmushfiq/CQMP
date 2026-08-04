<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
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
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('Receptionist');

        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $booking = Booking::create([
            'booking_number' => 'BK-20260804-999',
            'doctor_id'      => $doctor->id,
            'patient_name'   => 'Delete Test Patient',
            'patient_phone'  => '01700000000',
            'patient_type'   => 'New',
            'booking_date'   => Carbon::tomorrow()->toDateString(),
            'status'         => \App\Enums\BookingStatus::PENDING,
        ]);

        $response = $this->actingAsJwt($user)->deleteJson("/api/v1/bookings/{$booking->id}");

        $response->assertOk()
                 ->assertJsonPath('message', 'Booking deleted successfully.');

        $this->assertDatabaseMissing('bookings', ['id' => $booking->id]);
    }

    public function test_booking_creation_with_empty_phone_string(): void
    {
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('Receptionist');

        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $response = $this->actingAsJwt($user)->postJson('/api/v1/bookings', [
            'doctor_id' => $doctor->id,
            'patient_name' => 'Test Patient 1',
            'patient_phone' => '',
            'patient_type' => 'New',
            'booking_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(201);

        // Submit a second booking with empty phone on same day
        $response2 = $this->actingAsJwt($user)->postJson('/api/v1/bookings', [
            'doctor_id' => $doctor->id,
            'patient_name' => 'Test Patient 2',
            'patient_phone' => '',
            'patient_type' => 'New',
            'booking_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response2->assertStatus(201);
    }

    public function test_booking_creation_with_empty_cutoff_setting(): void
    {
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('Receptionist');

        // Simulate empty string in settings table for booking_cutoff_time
        \App\Models\Setting::set('booking_cutoff_time', '');

        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $response = $this->actingAsJwt($user)->postJson('/api/v1/bookings', [
            'doctor_id' => $doctor->id,
            'patient_name' => 'Test Patient',
            'patient_phone' => '01700000000',
            'patient_type' => 'New',
            'booking_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(201);
    }

    public function test_booking_sequence_increments_when_previous_booking_exists_for_date(): void
    {
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('Receptionist');

        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $date = Carbon::tomorrow()->toDateString();
        $dateStr = Carbon::tomorrow()->format('Ymd');

        // Create pre-existing booking BK-{dateStr}-001
        Booking::create([
            'booking_number' => "BK-{$dateStr}-001",
            'doctor_id'      => $doctor->id,
            'patient_name'   => 'Existing Patient',
            'patient_phone'  => '01711111111',
            'patient_type'   => 'New',
            'booking_date'   => $date,
            'status'         => \App\Enums\BookingStatus::PENDING,
        ]);

        // Attempt new booking submission for the same date
        $response = $this->actingAsJwt($user)->postJson('/api/v1/bookings', [
            'doctor_id'    => $doctor->id,
            'patient_name' => 'ABC',
            'patient_phone'=> '',
            'patient_type' => 'New',
            'booking_date' => $date,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'booking_number' => "BK-{$dateStr}-002",
            'patient_name'   => 'ABC',
        ]);
    }
}

