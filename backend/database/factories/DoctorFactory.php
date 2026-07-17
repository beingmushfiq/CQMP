<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

class DoctorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id'                 => Clinic::factory(),
            'name'                      => 'Dr. ' . fake()->name(),
            'specialization'            => fake()->randomElement(['Cardiologist', 'General Physician', 'Dermatologist', 'Orthopedic']),
            'average_consultation_time' => fake()->randomElement([10, 15, 20]),
            'is_available'              => true,
        ];
    }
}
