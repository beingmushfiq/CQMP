<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_day_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->integer('serial_no');
            $table->string('appointment_type')->default('Walk-in'); // Walk-in, Online
            $table->string('status')->default('Waiting'); // Waiting, Called, Completed, Skipped, Cancelled
            $table->string('priority')->default('Normal'); // Normal, Emergency
            $table->integer('estimated_wait')->default(0); // minutes
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_items');
    }
};
