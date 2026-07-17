<?php

namespace App\Filament\Resources\Patients\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class PatientForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('phone')
                    ->tel()
                    ->required(),
                Textarea::make('notes')
                    ->columnSpanFull(),
                Toggle::make('is_blocked')
                    ->required(),
                TextInput::make('blocked_reason'),
                TextInput::make('qr_identifier'),
            ]);
    }
}
