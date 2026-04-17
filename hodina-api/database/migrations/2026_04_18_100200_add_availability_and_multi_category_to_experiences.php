<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('experiences', function (Blueprint $table) {
            if (! Schema::hasColumn('experiences', 'availability_start')) {
                $table->date('availability_start')->nullable()->after('available_days');
            }
            if (! Schema::hasColumn('experiences', 'availability_end')) {
                $table->date('availability_end')->nullable()->after('availability_start');
            }
        });

        Schema::create('category_experience', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('experience_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['category_id', 'experience_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_experience');
        Schema::table('experiences', function (Blueprint $table) {
            if (Schema::hasColumn('experiences', 'availability_start')) {
                $table->dropColumn('availability_start');
            }
            if (Schema::hasColumn('experiences', 'availability_end')) {
                $table->dropColumn('availability_end');
            }
        });
    }
};
