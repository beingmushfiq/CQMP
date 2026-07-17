<?php

namespace App\Filament\Resources\Doctors\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class DoctorForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('clinic_id')
                    ->relationship('clinic', 'name')
                    ->required(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('photo'),
                TextInput::make('specialization')
                    ->required(),
                TextInput::make('average_consultation_time')
                    ->required()
                    ->numeric()
                    ->default(15),
                TextInput::make('break_message'),
                TextInput::make('english_break_message'),
                Toggle::make('is_available')
                    ->required(),
            ]);
    }
}
