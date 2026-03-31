<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('guesthouse_id')->nullable()->constrained()->nullOnDelete();
            $table->string('role')->default('guest')->index();
            $table->string('phone')->nullable();
            $table->string('locale', 5)->default('ro');
            $table->string('timezone')->default('Europe/Chisinau');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('guesthouse_id');
            $table->dropColumn([
                'role',
                'phone',
                'locale',
                'timezone',
                'is_active',
                'last_login_at',
            ]);
        });
    }
};
