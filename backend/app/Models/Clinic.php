<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'logo',
        'address',
        'phone',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function doctors(): HasMany
    {
        return $this->hasMany(Doctor::class);
    }

    public function receptionists(): HasMany
    {
        return $this->hasMany(Receptionist::class);
    }

    public function queueDays(): HasMany
    {
        return $this->hasMany(QueueDay::class);
    }
}
