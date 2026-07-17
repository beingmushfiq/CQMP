<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'           => fake()->name(),
            'phone'          => fake()->unique()->numerify('017########'),
            'notes'          => null,
            'is_blocked'     => false,
            'blocked_reason' => null,
            'qr_identifier'  => fake()->unique()->uuid(),
        ];
    }
}
