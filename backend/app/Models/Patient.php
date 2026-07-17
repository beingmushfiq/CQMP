<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'notes',
        'is_blocked',
        'blocked_reason',
        'qr_identifier',
    ];

    protected $casts = [
        'is_blocked' => 'boolean',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function queueItems(): HasMany
    {
        return $this->hasMany(QueueItem::class);
    }
}
