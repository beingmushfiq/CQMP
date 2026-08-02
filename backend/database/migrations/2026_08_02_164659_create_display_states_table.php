<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('display_states', function (Blueprint $table) {
            $table->id();
            $table->string('mode')->default('NORMAL'); // NORMAL, BREAK, REPORT, EMERGENCY, LUNCH, PRAYER, etc.
            $table->string('title_bn')->nullable();
            $table->string('title_en')->nullable();
            $table->text('message_bn')->nullable();
            $table->text('message_en')->nullable();
            $table->timestamp('resume_at')->nullable();
            $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('activated_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('display_states');
    }
};
