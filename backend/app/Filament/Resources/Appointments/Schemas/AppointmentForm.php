<?php

namespace App\Filament\Resources\Appointments\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class AppointmentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('patient_id')
                    ->relationship('patient', 'name')
                    ->required(),
                Select::make('doctor_id')
                    ->relationship('doctor', 'name')
                    ->required(),
                DatePicker::make('appointment_date')
                    ->required(),
                TextInput::make('serial')
                    ->numeric(),
                TextInput::make('status')
                    ->required()
                    ->default('Pending'),
                DateTimePicker::make('check_in_time'),
            ]);
    }
}
