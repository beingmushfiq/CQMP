<?php

namespace App\Enums;

enum DisplayMode: string
{
    case NORMAL = 'NORMAL';
    case BREAK = 'BREAK';
    case REPORT = 'REPORT';
    case EMERGENCY = 'EMERGENCY';
    
    // Future-ready display states
    case LUNCH = 'LUNCH';
    case PRAYER = 'PRAYER';
    case OFFLINE = 'OFFLINE';
    case MAINTENANCE = 'MAINTENANCE';
    case CUSTOM = 'CUSTOM';
}
