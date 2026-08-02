<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_logs', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // patient_called, patient_recalled, emergency, break_start, break_end, report_review, custom, etc.
            $table->integer('priority')->default(5);
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('serial_no')->nullable();
            $table->text('text_bn')->nullable();
            $table->text('text_en')->nullable();
            $table->string('language_mode')->default('both'); // bn, en, both
            $table->string('voice_provider')->default('web_speech'); // web_speech, server_tts, fallback
            $table->string('status')->default('played'); // queued, playing, played, preempted, failed
            $table->integer('retries')->default(0);
            $table->foreignId('played_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
            $table->index('serial_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_logs');
    }
};
