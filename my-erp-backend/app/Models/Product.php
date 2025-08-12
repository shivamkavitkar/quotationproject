<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'product'; // Your table name is 'product' in shivamthegreat_db
    protected $primaryKey = 'product_id'; // Your primary key is 'product_id'
    public $timestamps = false; // You've explicitly set timestamps to false

    protected $casts = [
        'specification_value' => 'array', // Assuming this is a JSON column in your DB
    ];

    // This model does NOT specify a $connection, so it will use the 'default' connection
    // which is configured to 'mysql' (shivamthegreat_db) in config/database.php.

    protected $fillable = [
    'code',
    'code_no',
    'type',
    'production_type',
    'category_id',
    'category_name',
    'subcategory_id',
    'subcategory_name',
    'name',
    'hsn_code',
    'sgst_per',
    'cgst_per',
    'igst_per',
    'service_sgst',
    'service_cgst',
    'mini_level',
    'unit',
    'picture',
    'min_price',
    'price',
    'description',
    'color',
    'color1',
    'color2',
    'size',
    'size1',
    'size2',
    'thickness',
    'seater',
    'lenght', // Note: This is spelled 'lenght' in your table
    'width',
    'height_min',
    'height_max',
    'depth',
    'weight',
    'created_by',
    'created_date_time',
    'delete_status',
    'delete_by',
    'delete_datetime',
    'pro_base_status',
    'pro_handle_status',
    'pro_hydraulic_status',
    'pro_wheels_status',
    'pro_mould_status',
    'pro_mechanism_status',
    'pro_foam_density_status',
    'pro_foam_thick_status',
    'pro_wooden_shell_status',
    'pro_fiber_shell_status',
    'pro_size_status',
    'pro_size_status1',
    'pro_size_status2',
    'pro_pipe_size_status',
    'pro_pipe_thick_status',
    'pro_fabric_status',
    'pro_color_status',
    'pro_color_status1',
    'pro_color_status2',
    'pro_coating_color_status',
    'pro_board_color_status',
    'pro_board_thick_status',
    'pro_edge_bin_thick_status',
    'pro_edge_bin_color_status',
    'pro_metal_sheet_thick_status',
    'pro_glass_size_status',
    'pro_glass_thick_status',
    'pro_partition_size_status',
    'pro_partition_thick_status',
    'pro_steel_plate_status',
    'pro_steel_shell_status',
    'pro_perforated_shell_status',
    'pro_perforated_sheet_status',
    'pro_granite_color_status',
    'pro_granite_thick_status',
    'pro_polish_color_status',
    'pro_solid_wood_thick_status',
    'bolt',
    'handel',
    'base',
    'armrest',
    'color_dec',
    'framrest',
    'mechanism',
    'fabric',
    'size_dec',
    'mould',
    'foam',
    'transport_type',
    'foam_thickness',
    'foam_density',

    'coating_color',
    'board_thickness',
    'board_color',
    'edge_bin_color',
    'edge_bin_thickness',
    'wheels',
    'wooden_shell',
    'fiber_shell',
    'pipe_size',
    'pipe_thickness',
    'glass_size',
    'glass_thick',
    'metal_sheet_thick',
    'partition_size',
    'partition_thick',
    'steel_plate',
    'steel_shell',
    'perforated_shell',
    'perforated_sheet',
    'granite_color',
    'granite_thick',
    'polish_color',
    'solid_wood_thick',
    'glass',
    'hydraulic',
    'iron',
    'powdercoating',
    'seat',
    'thickness_dec',
    'wheel',
    'wood',
    'stock_created_by',
    'stock_created_date',
    'current_stock_location',
    'current_stock',
    'search_data',
    'specification',
    'specification_value',
    'desc_head',
    'product_description',
    // 'dec_json' column was in your SQL dump but not in the text list, added here for completeness
    
];

    /**
     * Get the category that owns the product.
     * Assumes a 'categories' table with 'id' as primary key in shivamthegreat_db.
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }

    /**
     * Get the subcategory that owns the product.
     * Assumes a 'subcategories' table with 'id' as primary key in shivamthegreat_db.
     */
    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class, 'subcategory_id', 'id');
    }
}