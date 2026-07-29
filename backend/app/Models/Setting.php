<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key.
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        $setting = static::where('key', $key)->first();
        return $setting?->value ?? $default;
    }

    /**
     * Set a setting value by key (upsert).
     */
    public static function set(string $key, ?string $value): static
    {
        return static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /**
     * Get all settings as a key-value array.
     */
    public static function allAsArray(): array
    {
        return static::pluck('value', 'key')->toArray();
    }
}
