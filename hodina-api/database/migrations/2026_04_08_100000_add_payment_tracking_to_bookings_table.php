<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('payment_status')->default('pending')->after('total_amount')->index();
            $table->decimal('paid_amount', 10, 2)->default(0)->after('payment_status');
            $table->decimal('refunded_amount', 10, 2)->default(0)->after('paid_amount');
            $table->timestamp('paid_at')->nullable()->after('refunded_amount');
            $table->timestamp('refunded_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'payment_status',
                'paid_amount',
                'refunded_amount',
                'paid_at',
                'refunded_at',
            ]);
        });
    }
};
