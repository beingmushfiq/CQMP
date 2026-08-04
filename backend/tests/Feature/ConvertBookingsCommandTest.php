<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\QueueItem;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConvertBookingsCommandTest extends TestCase
{
    use RefreshDatabase;

    private Doctor $doctor;
    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clinic = Clinic::factory()->create();
        $this->doctor = Doctor::factory()->create(['clinic_id' => $this->clinic->id]);
    }

    private function makeConfirmedBooking(Doctor $doctor, string $date, ?Patient $patient = null): Booking
    {
        $patient ??= Patient::factory()->create();
        $uniq = fake()->unique()->numberBetween(100, 999);
        return Booking::create([
            'booking_number' => "BK-{$uniq}-TEST",
            'doctor_id'      => $doctor->id,
            'patient_id'     => $patient->id,
            'patient_name'   => $patient->name,
            'patient_phone'  => $patient->phone,
            'patient_type'   => 'New',
            'booking_date'   => $date,
            'status'         => BookingStatus::CONFIRMED->value,
            'confirmed_at'   => now(),
        ]);
    }

    // ── Happy Path ──────────────────────────────────────────────────────────

    public function test_command_converts_confirmed_booking_for_today(): void
    {
        $today = Carbon::today()->toDateString();
        $this->makeConfirmedBooking($this->doctor, $today);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $booking = Booking::first();
        $this->assertEquals(BookingStatus::COMPLETED->value, $booking->status->value);
        $this->assertNotNull($booking->converted_at);
        $this->assertEquals(1, QueueItem::count());
    }

    public function test_command_converts_checked_in_booking_for_today(): void
    {
        $patient = Patient::factory()->create();
        $today = Carbon::today()->toDateString();
        $uniq = fake()->unique()->numberBetween(100, 999);
        Booking::create([
            'booking_number' => "BK-{$uniq}-TEST",
            'doctor_id'      => $this->doctor->id,
            'patient_id'     => $patient->id,
            'patient_name'   => $patient->name,
            'patient_phone'  => $patient->phone,
            'patient_type'   => 'New',
            'booking_date'   => $today,
            'status'         => BookingStatus::CHECKED_IN->value,
            'checked_in_at'  => now(),
        ]);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(1, QueueItem::count());
    }

    public function test_command_creates_queue_day_if_none_exists(): void
    {
        $today = Carbon::today()->toDateString();
        $this->makeConfirmedBooking($this->doctor, $today);
        $this->assertEquals(0, QueueDay::count());

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(1, QueueDay::count());
        $this->assertEquals('opened', QueueDay::first()->status);
    }

    public function test_command_uses_existing_queue_day(): void
    {
        $today = Carbon::today()->toDateString();
        $queueDay = QueueDay::factory()->create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'date'      => $today,
        ]);

        $this->makeConfirmedBooking($this->doctor, $today);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(1, QueueDay::count());
        $this->assertEquals($queueDay->id, QueueItem::first()->queue_day_id);
    }

    // ── Idempotency ─────────────────────────────────────────────────────────

    public function test_command_does_not_double_convert_already_converted_booking(): void
    {
        $today = Carbon::today()->toDateString();
        QueueDay::factory()->create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'date'      => $today,
        ]);

        $patient = Patient::factory()->create();
        $uniq = fake()->unique()->numberBetween(100, 999);
        Booking::create([
            'booking_number' => "BK-{$uniq}-TEST",
            'doctor_id'      => $this->doctor->id,
            'patient_id'     => $patient->id,
            'patient_name'   => $patient->name,
            'patient_phone'  => $patient->phone,
            'patient_type'   => 'New',
            'booking_date'   => $today,
            'status'         => BookingStatus::COMPLETED->value,
            'converted_at'   => now(),
        ]);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(0, QueueItem::count());
    }

    public function test_running_command_twice_converts_only_once(): void
    {
        $today = Carbon::today()->toDateString();
        $this->makeConfirmedBooking($this->doctor, $today);

        $this->artisan('bookings:convert-today')->assertSuccessful();
        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(1, QueueItem::count());
    }

    // ── Filtering / Scoping ─────────────────────────────────────────────────

    public function test_command_ignores_bookings_for_other_dates(): void
    {
        $tomorrow = Carbon::tomorrow()->toDateString();
        $this->makeConfirmedBooking($this->doctor, $tomorrow);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(0, QueueItem::count());
        $this->assertEquals(BookingStatus::CONFIRMED->value, Booking::first()->status->value);
    }

    public function test_command_ignores_pending_bookings(): void
    {
        $patient = Patient::factory()->create();
        $today = Carbon::today()->toDateString();
        $uniq = fake()->unique()->numberBetween(100, 999);
        Booking::create([
            'booking_number' => "BK-{$uniq}-TEST",
            'doctor_id'      => $this->doctor->id,
            'patient_id'     => $patient->id,
            'patient_name'   => $patient->name,
            'patient_phone'  => $patient->phone,
            'patient_type'   => 'New',
            'booking_date'   => $today,
            'status'         => BookingStatus::PENDING->value,
        ]);

        $this->artisan('bookings:convert-today')->assertSuccessful();

        $this->assertEquals(0, QueueItem::count());
        $this->assertEquals(BookingStatus::PENDING->value, Booking::first()->status->value);
    }

    public function test_command_accepts_custom_date_option(): void
    {
        $yesterday = Carbon::yesterday()->toDateString();

        QueueDay::factory()->create([
            'doctor_id' => $this->doctor->id,
            'clinic_id' => $this->clinic->id,
            'date'      => $yesterday,
        ]);

        $this->makeConfirmedBooking($this->doctor, $yesterday);

        $this->artisan("bookings:convert-today --date={$yesterday}")->assertSuccessful();

        $this->assertEquals(1, QueueItem::count());
    }

    public function test_command_accepts_doctor_filter_option(): void
    {
        $otherDoctor = Doctor::factory()->create(['clinic_id' => $this->clinic->id]);
        $today = Carbon::today()->toDateString();

        $this->makeConfirmedBooking($this->doctor, $today);
        $this->makeConfirmedBooking($otherDoctor, $today);

        $this->artisan("bookings:convert-today --doctor={$this->doctor->id}")->assertSuccessful();

        $this->assertEquals(1, QueueItem::count());
        $convertedDoctorId = QueueItem::first()->queueDay->doctor_id;
        $this->assertEquals($this->doctor->id, $convertedDoctorId);
    }
}