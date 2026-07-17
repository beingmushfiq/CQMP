<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'photo',
        'specialization',
        'average_consultation_time',
        'break_message',
        'english_break_message',
        'is_available',
    ];

    protected $casts = [
        'is_available' => 'boolean',
        'average_consultation_time' => 'integer',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function queueDays(): HasMany
    {
        return $this->hasMany(QueueDay::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function delays(): HasMany
    {
        return $this->hasMany(DoctorDelay::class);
    }
}
