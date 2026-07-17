<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClinicFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'    => fake()->company() . ' Clinic',
            'address' => fake()->address(),
            'phone'   => fake()->phoneNumber(),
        ];
    }
}
