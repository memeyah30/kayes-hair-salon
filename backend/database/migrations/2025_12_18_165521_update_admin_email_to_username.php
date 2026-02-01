<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update admin email from 'admin@tholits.local' to 'admin'
        DB::table('admins')
            ->where('email', 'admin@tholits.local')
            ->update(['email' => 'admin']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert admin email back to 'admin@tholits.local'
        DB::table('admins')
            ->where('email', 'admin')
            ->update(['email' => 'admin@tholits.local']);
    }
};
