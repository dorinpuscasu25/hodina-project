<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('guesthouse_role')
                ->nullable()
                ->after('role')
                ->index();
        });

        DB::table('users')
            ->where('role', User::ROLE_HOST)
            ->whereNotNull('guesthouse_id')
            ->update([
                'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['guesthouse_role']);
            $table->dropColumn('guesthouse_role');
        });
    }
};
