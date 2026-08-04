<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class QueueItem
 *
 * @property int $id
 * @property int $queue_day_id
 * @property int $patient_id
 * @property int $serial_no
 * @property string $appointment_type
 * @property string $status
 * @property string $priority
 * @property int|null $estimated_wait
 * @property \Illuminate\Support\Carbon|null $called_at
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property string|null $remarks
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 *
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
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

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
