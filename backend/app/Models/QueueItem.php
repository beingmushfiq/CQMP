<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QueueItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'queue_day_id',
        'patient_id',
        'serial_no',
        'appointment_type',
        'status',
        'priority',
        'estimated_wait',
        'called_at',
        'completed_at',
        'remarks',
    ];

    protected $casts = [
        'serial_no' => 'integer',
        'estimated_wait' => 'integer',
        'called_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function queueDay(): BelongsTo
    {
        return $this->belongsTo(QueueDay::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
