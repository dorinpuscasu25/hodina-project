<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categoryables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->morphs('categoryable');
            $table->timestamps();

            $table->unique(['category_id', 'categoryable_type', 'categoryable_id'], 'categoryables_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categoryables');
    }
};
