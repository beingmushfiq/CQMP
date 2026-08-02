<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisplayState extends Model
{
    use HasFactory;

    protected $table = 'display_states';

    protected $fillable = [
        'mode',
        'title_bn',
        'title_en',
        'message_bn',
        'message_en',
        'resume_at',
        'activated_by',
        'activated_at',
        'metadata',
    ];

    protected $casts = [
        'resume_at' => 'datetime',
        'activated_at' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Get the user that activated this state.
     */
    public function activatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }
}
