<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'online',
        'api_version' => 'v1',
    ]);
});

Route::fallback(function () {
    return response()->json([
        'message' => 'API endpoint not found. Please check your request URL.',
    ], 404);
});
