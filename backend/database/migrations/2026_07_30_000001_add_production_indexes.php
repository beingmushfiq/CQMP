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
 *  5. audit_logs(user_id, timestamp)                      — audit queries
 *  6. patients(phone)                                     — phone lookup / dedup
 */
return new class extends Migration
{
    private function addIndexSafely(string $table, array|string $columns, string $indexName): void
    {
        if (Schema::hasIndex($table, $indexName)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $t) use ($columns, $indexName) {
                $t->index($columns, $indexName);
            });
        } catch (\Throwable $e) {
            // Index might already exist under duplicate run attempt
        }
    }

    private function dropIndexSafely(string $table, string $indexName): void
    {
        if (! Schema::hasIndex($table, $indexName)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $t) use ($indexName) {
                $t->dropIndex($indexName);
            });
        } catch (\Throwable $e) {
            // Index might already be dropped
        }
    }

    public function up(): void
    {
        $this->addIndexSafely(
            'queue_items',
            ['queue_day_id', 'status', 'serial_no'],
            'idx_queue_items_day_status_serial'
        );

        $this->addIndexSafely(
            'queue_items',
            ['queue_day_id', 'status', 'priority', 'serial_no'],
            'idx_queue_items_day_status_priority_serial'
        );

        $this->addIndexSafely(
            'queue_days',
            ['doctor_id', 'date'],
            'idx_queue_days_doctor_date'
        );

        $this->addIndexSafely(
            'doctor_delays',
            ['doctor_id', 'end_time'],
            'idx_doctor_delays_doctor_end_time'
        );

        $this->addIndexSafely(
            'audit_logs',
            ['user_id', 'timestamp'],
            'idx_audit_logs_user_timestamp'
        );

        $this->addIndexSafely(
            'patients',
            'phone',
            'idx_patients_phone'
        );
    }

    public function down(): void
    {
        $this->dropIndexSafely('queue_items', 'idx_queue_items_day_status_serial');
        $this->dropIndexSafely('queue_items', 'idx_queue_items_day_status_priority_serial');
        $this->dropIndexSafely('queue_days', 'idx_queue_days_doctor_date');
        $this->dropIndexSafely('doctor_delays', 'idx_doctor_delays_doctor_end_time');
        $this->dropIndexSafely('audit_logs', 'idx_audit_logs_user_timestamp');
        $this->dropIndexSafely('patients', 'idx_patients_phone');
    }
};
