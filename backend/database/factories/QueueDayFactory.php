<?php

namespace Database\Factories;

use App\Models\Clinic;
use App\Models\Doctor;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

class QueueDayFactory extends Factory
{
    public function definition(): array
    {
        return [
            'clinic_id'  => Clinic::factory(),
            'doctor_id'  => Doctor::factory(),
            'date'       => Carbon::today()->toDateString(),
            'status'     => 'opened',
            'opened_at'  => Carbon::now(),
        ];
    }
}
