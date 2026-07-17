<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QueueDay extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'doctor_id',
        'date',
        'status',
        'opened_by',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'date' => 'date',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QueueItem::class);
    }
}
