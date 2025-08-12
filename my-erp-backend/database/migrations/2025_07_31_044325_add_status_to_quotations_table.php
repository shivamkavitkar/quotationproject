<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddStatusToQuotationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // IMPORTANT: Table name changed to 'quotation' (singular) as per your clarification
        Schema::connection('scomfort')->table('quotation', function (Blueprint $table) {
            $table->string('status')->notNull()->default('draft')->after('quot_no');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // IMPORTANT: Table name changed to 'quotation' (singular) as per your clarification
        Schema::connection('scomfort')->table('quotation', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
}