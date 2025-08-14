<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::connection('scomfort')->table('quotation', function (Blueprint $table) {
            // status कॉलम को 'quot_no' कॉलम के बाद, 'final' डिफ़ॉल्ट वैल्यू के साथ जोड़ता है
            $table->string('status')->nullable()->default('final')->after('quot_no');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::connection('scomfort')->table('quotation', function (Blueprint $table) {
            // migration को undo करने के लिए status कॉलम को हटाता है
            $table->dropColumn('status');
        });
    }
};