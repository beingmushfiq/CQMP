<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Doctor;
use App\Models\QueueDay;
use App\Services\BookingConversionService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ConvertBookingsToQueue extends Command
{
    protected $signature = 'bookings:convert-today
                            {--date=   : Date to convert (Y-m-d). Defaults to today.}
                            {--doctor= : Specific doctor ID (integer). Converts all doctors if omitted.}';

    protected $description = 'Convert confirmed/checked-in advance bookings for the given date into queue items.';

    public function __construct(private readonly BookingConversionService $conversionService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : Carbon::today()->toDateString();

        $doctorIdFilter = $this->option('doctor');

        $this->info("Converting confirmed bookings for date: {$date}");

        // Collect distinct doctor IDs that have unconverted bookings for this date
        $query = Booking::forDate($date)
            ->whereIn('status', [
                BookingStatus::CONFIRMED->value,
                BookingStatus::CHECKED_IN->value,
            ])
            ->whereNull('converted_at')
            ->select('doctor_id')
            ->distinct();

        if ($doctorIdFilter !== null && $doctorIdFilter !== '') {
            $query->where('doctor_id', (int) $doctorIdFilter);
        }

        $doctorIds = $query->pluck('doctor_id');

        if ($doctorIds->isEmpty()) {
            $this->info('No unconverted bookings found. Nothing to do.');
            return self::SUCCESS;
        }

        $totalConverted = 0;

        foreach ($doctorIds as $doctorId) {
            $doctor = Doctor::find($doctorId);
            if (! $doctor) {
                $this->warn("  Doctor ID {$doctorId} not found. Skipping.");
                continue;
            }

            // Find the open queue day for this doctor on the target date
            $queueDay = QueueDay::where('doctor_id', $doctorId)
                ->where('date', '>=', Carbon::parse($date)->startOfDay())
                ->where('date', '<=', Carbon::parse($date)->endOfDay())
                ->latest()
                ->first();

            // If no queue day exists yet, create one only when converting today
            if (! $queueDay) {
                if ($date === Carbon::today()->toDateString()) {
                    $queueDay = QueueDay::create([
                        'doctor_id' => $doctorId,
                        'clinic_id' => $doctor->clinic_id,
                        'date'      => $date,
                        'status'    => 'opened',
                        'opened_at' => Carbon::now(),
                    ]);
                    $this->line("  Created QueueDay for Dr. {$doctor->name}");
                } else {
                    $this->warn("  No QueueDay for Dr. {$doctor->name} on {$date}. Skipping.");
                    continue;
                }
            }

            $count = $this->conversionService->convertForDate($date, $queueDay);
            $this->line("  Dr. {$doctor->name}: {$count} booking(s) converted.");
            $totalConverted += $count;
        }

        $this->info("Total bookings converted: {$totalConverted}");

        return self::SUCCESS;
    }
}
