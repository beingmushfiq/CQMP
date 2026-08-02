<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementLog extends Model
{
    protected $fillable = [
        'type',
        'priority',
        'patient_id',
        'serial_no',
        'text_bn',
        'text_en',
        'language_mode',
        'voice_provider',
        'status',
        'retries',
        'played_by',
        'metadata',
    ];

    protected $casts = [
        'priority' => 'integer',
        'retries'  => 'integer',
        'metadata' => 'array',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function playedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'played_by');
    }
}
