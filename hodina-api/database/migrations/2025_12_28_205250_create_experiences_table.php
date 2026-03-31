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
        Schema::create('experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guesthouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('status')->default('draft')->index();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('short_description')->nullable();
            $table->json('description')->nullable();
            $table->string('location_name')->nullable();
            $table->json('meeting_point')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Moldova');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('duration_minutes')->default(60);
            $table->unsignedInteger('max_guests')->default(1);
            $table->unsignedInteger('min_age')->default(0);
            $table->string('difficulty')->default('easy');
            $table->decimal('price_amount', 10, 2)->default(0);
            $table->string('currency', 3)->default('MDL');
            $table->string('price_mode')->default('per_person');
            $table->time('default_start_time')->nullable();
            $table->time('default_end_time')->nullable();
            $table->json('available_days')->nullable();
            $table->boolean('is_instant_book')->default(false);
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->string('video_url')->nullable();
            $table->json('included_items')->nullable();
            $table->json('excluded_items')->nullable();
            $table->json('what_to_bring')->nullable();
            $table->json('cancellation_policy')->nullable();
            $table->json('important_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('experiences');
    }
};
