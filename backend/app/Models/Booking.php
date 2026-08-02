<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    protected $fillable = [
        'booking_number',
        'doctor_id',
        'patient_id',
        'patient_name',
        'patient_phone',
        'patient_type',
        'booking_date',
        'preferred_slot',
        'remarks',
        'status',
        'serial_no',
        'queue_item_id',
        'converted_at',
        'converted_by',
        'confirmed_at',
        'confirmed_by',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
        'checked_in_at',
        'checked_in_by',
        'created_by',
        'metadata',
    ];

    protected $casts = [
        'status'       => BookingStatus::class,
        'booking_date' => 'date',
        'converted_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'checked_in_at'=> 'datetime',
        'metadata'     => 'array',
    ];

    // ── Relationships ──────────────────────────────────────────────────

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function queueItem(): BelongsTo
    {
        return $this->belongsTo(QueueItem::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function convertedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'converted_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────

    public function scopeTomorrow(Builder $q): Builder
    {
        return $q->where('booking_date', now()->addDay()->toDateString());
    }

    public function scopeForDate(Builder $q, string $date): Builder
    {
        return $q->where('booking_date', $date);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->whereIn('status', [
            BookingStatus::PENDING->value,
            BookingStatus::CONFIRMED->value,
            BookingStatus::CHECKED_IN->value,
        ]);
    }

    public function scopeConvertible(Builder $q): Builder
    {
        return $q->where('status', BookingStatus::CONFIRMED->value)
                 ->whereNull('converted_at');
    }

    // ── Helpers ───────────────────────────────────────────────────────

    public function isPending(): bool    { return $this->status === BookingStatus::PENDING; }
    public function isConfirmed(): bool  { return $this->status === BookingStatus::CONFIRMED; }
    public function isCancelled(): bool  { return $this->status === BookingStatus::CANCELLED; }
    public function isConverted(): bool  { return $this->converted_at !== null; }
}
