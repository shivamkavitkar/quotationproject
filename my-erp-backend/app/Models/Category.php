<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    /**
     * The database connection that should be used by the model.
     */
    protected $connection = 'scomfort';

    /**
     * The table associated with the model.
     */
    protected $table = 'product_category';

    /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the model should be timestamped (created_at, updated_at).
     * Set to false because your table does not have these columns.
     */
    public $timestamps = false;
}