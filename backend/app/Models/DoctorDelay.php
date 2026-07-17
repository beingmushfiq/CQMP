<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorDelay extends Model
{
    use HasFactory;

    protected $fillable = [
        'doctor_id',
        'delay_minutes',
        'reason',
        'start_time',
        'end_time',
    ];

    protected $casts = [
        'delay_minutes' => 'integer',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
