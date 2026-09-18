<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            $table->integer('queue_order')->default(0)->after('serial_no');
            $table->index(['queue_day_id', 'queue_order']);
        });

        // Backfill queue_order for existing records with their current serial_no
        DB::statement('UPDATE queue_items SET queue_order = serial_no WHERE queue_order = 0 OR queue_order IS NULL');
    }

    public function down(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            $table->dropIndex(['queue_day_id', 'queue_order']);
            $table->dropColumn('queue_order');
        });
    }
};
