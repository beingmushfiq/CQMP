<?php

namespace App\Filament\Resources\Clinics\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class ClinicForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('logo'),
                Textarea::make('address')
                    ->columnSpanFull(),
                TextInput::make('phone')
                    ->tel(),
                Textarea::make('settings')
                    ->columnSpanFull(),
            ]);
    }
}
