<?php

namespace App\Enums;

enum BookingStatus: string
{
    case PENDING    = 'Pending';
    case CONFIRMED  = 'Confirmed';
    case CHECKED_IN = 'CheckedIn';
    case COMPLETED  = 'Completed';
    case CANCELLED  = 'Cancelled';
    case EXPIRED    = 'Expired';
    case NO_SHOW    = 'NoShow';

    public function label(): string
    {
        return match($this) {
            self::PENDING    => 'Pending',
            self::CONFIRMED  => 'Confirmed',
            self::CHECKED_IN => 'Checked In',
            self::COMPLETED  => 'Completed',
            self::CANCELLED  => 'Cancelled',
            self::EXPIRED    => 'Expired',
            self::NO_SHOW    => 'No Show',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING    => 'amber',
            self::CONFIRMED  => 'emerald',
            self::CHECKED_IN => 'indigo',
            self::COMPLETED  => 'slate',
            self::CANCELLED  => 'rose',
            self::EXPIRED    => 'orange',
            self::NO_SHOW    => 'red',
        };
    }

    /** Allowed transitions FROM this status */
    public function canTransitionTo(self $next): bool
    {
        return match($this) {
            self::PENDING    => in_array($next, [self::CONFIRMED, self::CANCELLED, self::EXPIRED]),
            self::CONFIRMED  => in_array($next, [self::CHECKED_IN, self::CANCELLED, self::NO_SHOW, self::COMPLETED]),
            self::CHECKED_IN => in_array($next, [self::COMPLETED, self::CANCELLED]),
            default          => false,
        };
    }
}
