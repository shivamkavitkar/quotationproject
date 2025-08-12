<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\StsCompany;

class Quotation extends Model
{
    use HasFactory;

    protected $connection = 'scomfort';
    protected $table = 'quotation';
    public $timestamps = false;
    protected $guarded = [];

    /**
     * Customer ke saath relationship (Search ke liye zaroori).
     */
    public function customer()
    {
        return $this->belongsTo(StsCompany::class, 'customer_id');
    }

    // --- Humne yahan se lead() aur latestActivity() functions hata diye hain ---
    // --- Kyunki simplified controller mein unki zaroorat nahi hai. ---

}