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
        Schema::create('experience_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('experience_id')->constrained()->cascadeOnDelete();
            $table->foreignId('experience_recurrence_id')->nullable()->index();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->unsignedInteger('capacity');
            $table->unsignedInteger('reserved_guests')->default(0);
            $table->string('status')->default('scheduled')->index();
            $table->boolean('is_manual')->default(false);
            $table->string('title_override')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['experience_id', 'starts_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('experience_sessions');
    }
};
