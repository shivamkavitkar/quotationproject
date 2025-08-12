<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StsCompany extends Model
{
    use HasFactory;

    /**
     * The database connection that should be used by the model.
     */
    protected $connection = 'scomfort';

    /**
     * The table associated with the model.
     */
    protected $table = 'sts_company';

    /**
     * The primary key for the model.
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the IDs are auto-incrementing.
     * This is true by default for integer keys, but we're adding it for clarity.
     */
    public $incrementing = true;

    /**
     * Indicates if the model should be timestamped.
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'company_name',
        'inactive_status',
        'merge_id',
        'account_id',
        'master_customer_id',
        'contact_person',
        'customer_type',
        'contact_no1',
        'contact_no2',
        'address',
        'billing_pin_code',
        'billing_building_no',
        'billing_area',
        'billing_landmark',
        'billing_locality',
        'billing_city',
        'billing_state',
        'billing_country',
        'billing_person_name',
        'billing_person_contact',
        'delivery_person_name',
        'delivery_person_contact',
        'delivery_address',
        'delivery_building_no',
        'delivery_area',
        'delivery_landmark',
        'delivery_locality',
        'delivery_city',
        'delivery_state',
        'delivery_country',
        'city',
        'state',
        'country',
        'website',
        'email',
        'summary',
        'transaction_id',
        'cst_no',
        'tan_no',
        'tin_no',
        'pan_no',
        'aadhar_card',
        'pin_code',
        'opening_type',
        'opening_bal',
        'arn_no',
        'created_id',
        'created_date',
        'account_approval',
        'company_rep',
        'edited_date_time',
        'created_emp_id',
        'last_workout_date',
        'workout_type',
        'last_workout_by',
        'workout_id',
        'source_assign_by',
        'source_generated',
        'primary_billing_address_id',
        'primary_delivery_address_id',
        'multiple_contact_info',
        'vendor_no',
        'location_data',
        'comp_follow_status',
        'comp_next_date',
        'comp_activity_remark',
        'comp_activity_assign_to',
        'comp_meeting_time',
        'comp_meeting_date',
        'comp_meeting_location',
        'comp_activity_order_value',
        'comp_activity_priority',
        'comp_last_wo_date',
        'comp_last_wo_id',
        'comp_last_wo_no',
        'comp_last_wo_type',
        'comp_order_data',
    ];
}