<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accommodations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guesthouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('type_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('status')->default('draft')->index();
            $table->string('slug')->unique();
            $table->json('title');
            $table->json('short_description')->nullable();
            $table->json('description')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Moldova');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('max_guests')->default(1);
            $table->unsignedInteger('bedrooms')->default(1);
            $table->unsignedInteger('beds')->default(1);
            $table->decimal('bathrooms', 4, 1)->default(1);
            $table->unsignedInteger('units_total')->default(1);
            $table->unsignedInteger('min_nights')->default(1);
            $table->unsignedInteger('max_nights')->nullable();
            $table->decimal('nightly_rate', 10, 2)->default(0);
            $table->decimal('cleaning_fee', 10, 2)->default(0);
            $table->string('currency', 3)->default('MDL');
            $table->time('check_in_from')->nullable();
            $table->time('check_out_until')->nullable();
            $table->boolean('is_instant_book')->default(false);
            $table->string('cover_image')->nullable();
            $table->json('gallery')->nullable();
            $table->json('highlights')->nullable();
            $table->json('house_rules')->nullable();
            $table->json('cancellation_policy')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accommodations');
    }
};
