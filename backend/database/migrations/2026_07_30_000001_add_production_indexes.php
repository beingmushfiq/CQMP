<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Production Performance Indexes
 *
 * Why: Every queue operation in QueueEngine queries queue_items filtered
 * by queue_day_id + status + serial_no. Without composite indexes, MySQL
 * performs a full table scan on every request. At 50+ patients per day,
 * this creates measurable latency spikes under concurrent use.
 *
 * Indexes added:
 *  1. queue_items(queue_day_id, status, serial_no)       — all queue reads
 *  2. queue_items(queue_day_id, status, priority, serial_no) — callNext() ORDER BY
 *  3. queue_days(doctor_id, date)                         — today() + openQueue()
 *  4. doctor_delays(doctor_id, end_time)                  — recalculateWaitTimes()
 *  5. audit_logs(user_id, created_at)                     — audit queries
 *  6. patients(phone)                                     — phone lookup / dedup
 *
 * Risk: Adding indexes has no effect on existing data and is safe to run
 * on a live database. It will briefly lock each table (< 1 second for
 * small datasets). Schedule during off-peak hours if the clinic is live.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── queue_items ────────────────────────────────────────────────
        Schema::table('queue_items', function (Blueprint $table) {

            // Used by: createWalkIn (max serial), subscribeToQueue, today()
            // Covers: WHERE queue_day_id = ? AND status = ? ORDER BY serial_no
            $table->index(
                ['queue_day_id', 'status', 'serial_no'],
                'idx_queue_items_day_status_serial'
            );

            // Used by: callNext() — ORDER BY priority DESC, serial_no ASC
            // The priority column is included so MySQL can satisfy the
            // ORDER BY without a filesort.
            $table->index(
                ['queue_day_id', 'status', 'priority', 'serial_no'],
                'idx_queue_items_day_status_priority_serial'
            );
        });

        // ── queue_days ─────────────────────────────────────────────────
        Schema::table('queue_days', function (Blueprint $table) {

            // Used by: today(), openQueue(), updateDelay()
            // Covers: WHERE doctor_id = ? AND date >= ? AND date <= ?
            $table->index(
                ['doctor_id', 'date'],
                'idx_queue_days_doctor_date'
            );
        });

        // ── doctor_delays ──────────────────────────────────────────────
        Schema::table('doctor_delays', function (Blueprint $table) {

            // Used by: recalculateWaitTimes() — called after every queue action
            // Covers: WHERE doctor_id = ? AND end_time IS NULL
            $table->index(
                ['doctor_id', 'end_time'],
                'idx_doctor_delays_doctor_end_time'
            );
        });

        // ── audit_logs ─────────────────────────────────────────────────
        Schema::table('audit_logs', function (Blueprint $table) {

            // Used by: future audit trail queries and Filament admin panel
            $table->index(
                ['user_id', 'created_at'],
                'idx_audit_logs_user_created'
            );
        });

        // ── patients ───────────────────────────────────────────────────
        Schema::table('patients', function (Blueprint $table) {

            // Used by: publicBook() firstOrCreate by phone
            // Used by: ReceptionistDashboard phone lookup
            // Nullable column — partial index semantics handled by MySQL automatically
            $table->index('phone', 'idx_patients_phone');
        });
    }

    public function down(): void
    {
        Schema::table('queue_items', function (Blueprint $table) {
            $table->dropIndex('idx_queue_items_day_status_serial');
            $table->dropIndex('idx_queue_items_day_status_priority_serial');
        });

        Schema::table('queue_days', function (Blueprint $table) {
            $table->dropIndex('idx_queue_days_doctor_date');
        });

        Schema::table('doctor_delays', function (Blueprint $table) {
            $table->dropIndex('idx_doctor_delays_doctor_end_time');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_logs_user_created');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex('idx_patients_phone');
        });
    }
};
