<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    public function definition(): array
    {
        $date = Carbon::tomorrow()->toDateString();
        $dateStr = str_replace('-', '', $date);

        return [
            'booking_number' => "BK-{$dateStr}-" . str_pad(fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'doctor_id'      => Doctor::factory(),
            'patient_id'     => Patient::factory(),
            'patient_name'   => fake()->name(),
            'patient_phone'  => fake()->unique()->numerify('017########'),
            'patient_type'   => fake()->randomElement(['New', 'Follow-up', 'Report Showing']),
            'booking_date'   => $date,
            'status'         => BookingStatus::PENDING,
            'converted_at'   => null,
        ];
    }

    /** Booking for today (convertible on same day). */
    public function forToday(): static
    {
        return $this->state(fn () => ['booking_date' => Carbon::today()->toDateString()]);
    }

    /** Booking in confirmed state (ready to convert). */
    public function confirmed(): static
    {
        return $this->state(fn () => [
            'status'       => BookingStatus::CONFIRMED,
            'confirmed_at' => now(),
        ]);
    }

    /** Booking already converted. */
    public function converted(): static
    {
        return $this->state(fn () => [
            'status'       => BookingStatus::COMPLETED,
            'converted_at' => now(),
        ]);
    }
}
