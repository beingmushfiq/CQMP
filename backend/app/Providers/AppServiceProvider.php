<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ── Force HTTPS in production ─────────────────────────────
        // Without this, asset() and route() helpers generate http://
        // URLs even when the app is served over HTTPS, breaking
        // cookie Secure flags and mixed-content browser blocks.
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        // ── Prevent lazy loading (N+1 guard) ─────────────────────
        // In non-production environments, throw an exception whenever
        // an Eloquent relationship is accessed without eager-loading.
        // This catches N+1 query bugs during development/testing
        // before they reach production.
        Model::preventLazyLoading(! app()->environment('production'));

        // ── Prevent destructive commands in production ────────────
        // Disables php artisan migrate:fresh / db:wipe on production,
        // preventing accidental data loss.
        Model::preventSilentlyDiscardingAttributes(! app()->environment('production'));

        DB::prohibitDestructiveCommands(app()->environment('production'));
    }
}
