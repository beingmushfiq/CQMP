<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();

            // Human-friendly reference: BK-20260803-001
            $table->string('booking_number', 24)->unique();

            // Doctor this booking is for
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();

            // Patient link (nullable: patient may be created at check-in)
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();

            // Denormalised patient info (always stored for offline lookup)
            $table->string('patient_name');
            $table->string('patient_phone', 20);
            $table->string('patient_type')->default('New'); // New | Follow-up | Report Showing

            // Scheduling
            $table->date('booking_date');
            $table->string('preferred_slot', 50)->nullable(); // e.g. "10:00-10:30"
            $table->text('remarks')->nullable();

            // Status lifecycle
            // Pending → Confirmed → CheckedIn → Completed
            //         ↘ Cancelled / Expired / NoShow
            $table->string('status')->default('Pending');

            // Set on conversion to queue_items
            $table->integer('serial_no')->nullable();
            $table->foreignId('queue_item_id')->nullable()->constrained('queue_items')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->foreignId('converted_by')->nullable()->constrained('users')->nullOnDelete();

            // Confirmation
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();

            // Cancellation
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('cancel_reason')->nullable();

            // Check-in
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete();

            // Creator
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Extensible metadata (SMS sent, reminder flags, etc.)
            $table->json('metadata')->nullable();

            $table->timestamps();

            // Indexes for common queries
            $table->index(['booking_date', 'status']);
            $table->index(['doctor_id', 'booking_date']);
            $table->index('patient_phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
