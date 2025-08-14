<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
// Make sure this is App\Models\Quotation
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
// Added Storage facade
use Illuminate\Support\Facades\Log;
use App\Models\StsLead;
use Illuminate\Validation\Rule;
// Added Log facade
use Illuminate\Validation\ValidationException;
// Added for specific exception handling
use App\Models\StsCompany;

class QuotationController extends Controller {
    /**
    * Display a listing of the quotations.
    * GET /api/quotations
    *
    * @return \Illuminate\Http\JsonResponse
    */



// app/Http/Controllers/QuotationController.php

// app/Http/Controllers/QuotationController.php

public function index(Request $request)
{
    try {
        $perPage = 100;
        $search = $request->input('search');

        // STEP 1: Lead ID list (paginated)
        $leadQuery = DB::connection('scomfort')
            ->table('quotation')
            ->select('lead_id')
            ->where('lead_id', '>', 0)
            ->groupBy('lead_id')
            ->orderBy(DB::raw('MAX(id)'), 'desc');

        if ($search) {
            $matchingLeadIds = DB::connection('scomfort')
                ->table('quotation as q')
                ->join('sts_company as c', 'q.customer_id', '=', 'c.id')
                ->where(function ($q) use ($search) {
                    $q->where('q.quot_no', 'like', "%{$search}%")
                      ->orWhere('c.company_name', 'like', "%{$search}%");
                })
                ->pluck('q.lead_id')->unique();
            
            $leadQuery->whereIn('lead_id', $matchingLeadIds);
        }

        $paginatedLeads = $leadQuery->paginate($perPage);
        $leadIdsOnCurrentPage = $paginatedLeads->pluck('lead_id');

        if ($leadIdsOnCurrentPage->isEmpty()) {
            return response()->json($paginatedLeads);
        }

        // STEP 2: Quotation data for these leads
        $allQuotationsForPage = DB::connection('scomfort')
            ->table('quotation as q')
            ->select(
                'q.id', 'q.quot_no', 'q.status', 'q.lead_id', 'q.date', 'q.grand_total', 
                'q.customer_id', 'q.quot_id', 'q.contact_person_name', 'q.contact_no', 
                'c.company_name'
            )
            ->join('sts_company as c', 'q.customer_id', '=', 'c.id')
            ->whereIn('q.lead_id', $leadIdsOnCurrentPage)
            ->orderBy('q.id', 'desc')
            ->get()
            ->groupBy('lead_id');

        // STEP 3: Latest sts_lead_activity per lead_id
        $latestLeadActivity = DB::connection('scomfort')
            ->table('sts_lead_activity as sla')
            ->join(DB::raw('(SELECT lead_id, MAX(id) AS max_id 
                            FROM sts_lead_activity 
                            WHERE lead_id IN ('.implode(',', $leadIdsOnCurrentPage->toArray()).') 
                            GROUP BY lead_id) latest'),
                    function ($join) {
                        $join->on('sla.id', '=', 'latest.max_id');
                    })
            ->select('sla.lead_id', 'sla.status', 'sla.activity', 'sla.lead_priority', 'sla.created_date', 'sla.next_date')
            ->get()
            ->keyBy('lead_id');

        // STEP 4: Format data
        /** @var \Illuminate\Support\Collection $formattedLeads */
        $formattedLeads = $paginatedLeads->getCollection()->map(function ($lead) use ($allQuotationsForPage, $latestLeadActivity) {
            /** @var \Illuminate\Support\Collection $quotationsForThisLead */
            $quotationsForThisLead = $allQuotationsForPage->get($lead->lead_id, collect());
            
            /** @var \Illuminate\Support\Collection $groupedByQuotId */
            $groupedByQuotId = $quotationsForThisLead->groupBy('quot_id');

            /** @var \Illuminate\Support\Collection|null $latestQuotGroup */
            $latestQuotGroup = $groupedByQuotId->sortByDesc(function ($group) {
                /** @var \Illuminate\Support\Collection $group */
                return $group->max('id');
            })->first();

            if (!$latestQuotGroup) return null;

            $historicalQuotGroups = $groupedByQuotId->filter(function ($group, $quotId) use ($latestQuotGroup) {
                return $quotId !== $latestQuotGroup->first()->quot_id;
            });

            $history = $historicalQuotGroups->map(function ($group) {
                /** @var \stdClass $firstRow */
                $firstRow = $group->first();
                return [
                    'id' => $firstRow->id,
                    'quot_id' => $firstRow->quot_id,
                    'quot_no' => $firstRow->quot_no,
                    'date' => $firstRow->date,
                    'grand_total' => (float)$firstRow->grand_total,
                ];
            })->values()->toArray();

            /** @var \stdClass $latestQuotation */
            $latestQuotation = $latestQuotGroup->first();
            /** @var \stdClass|null $activityData */
            $activityData = $latestLeadActivity->get($latestQuotation->lead_id);

            return [
                'id' => $latestQuotation->id,
                'quot_id' => $latestQuotation->quot_id,
                'quot_no' => $latestQuotation->quot_no,
                'status' => optional($activityData)->status ?? $latestQuotation->status,
                'activity' => optional($activityData)->activity ?? null,
                'lead_priority' => optional($activityData)->lead_priority ?? null,
                'created_date' => optional($activityData)->created_date ?? null,
                'next_date' => optional($activityData)->next_date ?? null,
                'date' => $latestQuotation->date,
                'company_name' => $latestQuotation->company_name ?? 'N/A',
                'customer_id' => $latestQuotation->customer_id,
                'contact_person_name' => $latestQuotation->contact_person_name ?? 'N/A',
                'contact_no' => $latestQuotation->contact_no ?? 'N/A',
                'lead_id' => $latestQuotation->lead_id,
                'grand_total' => (float)($latestQuotation->grand_total ?? 0),
                'quotation_history' => $history,
            ];
        })->filter()->values();

        $paginatedLeads->setCollection($formattedLeads);

        return response()->json($paginatedLeads);

    } catch (\Exception $e) {
        Log::error('Failed to fetch quotation list: ' . $e->getMessage(), ['exception' => $e]);
        return response()->json(['message' => 'Server error while fetching quotations.'], 500);
    }
}

    
    /**
     * Display the specified quotation by its unique quotation number (quot_no).
     * This is used by frontend for Preview and Edit forms.
     * GET /api/quotations/{quot_no}
     *
     * @param  string  $quot_no The unique quotation number
     * @return \Illuminate\Http\JsonResponse
     */


    public function show($quot_no)
    {
        // Fetch all rows associated with this specific quot_no.
        // Eager load the 'customer' relationship as it's used in index and store.
        // Ensure the correct database connection 'scomfort' is specified.
        
        $quotationRows = Quotation::on( 'scomfort' )
        ->where( 'quot_no', $quot_no )
        ->with( 'customer' ) // Eager load the customer relationship
        ->orderBy( 'quot_id' ) // Order by quot_id to maintain consistency for product order
        ->get();

        if ( $quotationRows->isEmpty() ) {
            Log::warning( 'Quotation not found for quot_no: ' . $quot_no );
            return response()->json( [ 'message' => 'Quotation not found' ], 404 );
        }

        // The main quotation details ( customer info, addresses, general quote details )
        // are expected to be consistent across all rows for the same quot_no.
        // We take them from the first row to populate the main form data.
        $firstRow = $quotationRows->first();

        // Map each database row to a `ProductItemData` object for the frontend's `products` array.
        $productsData = $quotationRows->map(function ($item) {
            // Generate full image URL for frontend display
            $generatedImageUrl = null;
            if ($item->pro_image) {
                if (str_starts_with($item->pro_image, 'http://') || str_starts_with($item->pro_image, 'https://')) {
                    $generatedImageUrl = $item->pro_image;
                } else {
                    $generatedImageUrl = asset('storage/' . $item->pro_image);
                }
            }

            return [
                'tempId' => $item->quot_id, // Use quot_id as tempId for React's unique keys ( assuming it's unique per product row)
                'pro_id' => $item->pro_id ?? '',
                'pro_dec' => $item->pro_dectext ?? '', // Using 'pro_dectext' as per your schema analysis
                'hsn_code' => $item->hsn_code ?? '',
                'qty' => (float) ($item->qty ?? 0), // Cast to float for consistency with React numbers
                'mrp' => (float) ($item->mrp ?? 0),
                'discount' => (float) ($item->discount ?? 0),
                'discount_per' => (float) ($item->discount_per ?? 0),
                'total' => (float) ($item->total ?? 0),
                'pro_image_url' => $generatedImageUrl, // Full URL for displaying the image
                'pro_image_path' => $item->pro_image ?? null, // Original path for potential backend use (e.g., deletion)
                'description_head' => $item->description_head ?? '',
                'size' => $item->size ?? '',
                'colour' => $item->colour ?? '',
                // Include other product-related fields that your frontend `ProductItemData` interface expects
            ];
        })->toArray(); // Convert the collection of mapped products to a plain array

        // Construct the main quotation payload (`FormData` for React component)
        $responsePayload = [
            // Note: `quotation_id` in frontend FormData seems to refer to `quot_id` from the DB.
            // If `quotation_id` is supposed to be a unique ID for the whole quote (not just a product item),
            // you might need a different logic or field. Based on your usage, `quot_id` seems to be the row ID.
            'quotation_id' => $firstRow->quot_id, // Primary key of the first row (used as ID in frontend form)
            'quot_no' => $firstRow->quot_no, // The unique quote number (identifies the whole quote)
            'lead_id' => $firstRow->lead_id ?? '',
            // Format date for HTML date input (YYYY-MM-DD)
            'date' => $firstRow->date ? \Carbon\Carbon::parse($firstRow->date)->format('Y-m-d') : '',
            // Access company_name and other customer details via the eager-loaded `customer` relationship.
            // Sticking with `customer` relationship as it's used in `index` and `store`.
        'company_name' => $firstRow->customer->company_name ?? '',
        'contact_person_name' => $firstRow->contact_person_name ?? '', // Directly from quotation table
        'contact_no' => $firstRow->contact_no ?? '', // Directly from quotation table
        'email_id' => $firstRow->email_id ?? '', // Directly from quotation table
        'address' => $firstRow->address ?? '',
        'billing_pin_code' => $firstRow->billing_pin_code ?? '',
        'billing_building_no' => $firstRow->billing_building_no ?? '',
        'billing_area' => $firstRow->billing_area ?? '',
        'billing_landmark' => $firstRow->billing_landmark ?? '',
        'billing_locality' => $firstRow->billing_locality ?? '',
        'billing_city' => $firstRow->billing_city ?? '',
        'billing_state' => $firstRow->billing_state ?? '',
        'billing_country' => $firstRow->billing_country ?? '',
        'delivery_pin_code' => $firstRow->delivery_pin_code ?? '',
        'delivery_building_no' => $firstRow->delivery_building_no ?? '',
        'delivery_area' => $firstRow->delivery_area ?? '',
        'delivery_landmark' => $firstRow->delivery_landmark ?? '',
        'delivery_locality' => $firstRow->delivery_locality ?? '',
        'delivery_city' => $firstRow->delivery_city ?? '',
        'delivery_state' => $firstRow->delivery_state ?? '',
        'delivery_country' => $firstRow->delivery_country ?? '',
        'status' => $firstRow->status ?? 'draft', // Include the status
        'term_condition' => $firstRow->term_condition ?? '',
        'quotation_sub' => $firstRow->quotation_sub ?? '',
        // Ensure all other top-level fields your frontend `FormData` expects are included here,
        // mapping them directly from the `$firstRow` object.
        'products' => $productsData, // Nested array of product items
    ];

    return response()->json( [ 'data' => $responsePayload ] );
}

/**
* Store a newly created quotation in the database.
* POST /api/quotations
*
* @param  \Illuminate\Http\Request  $request
* @return \Illuminate\Http\JsonResponse
*/
/**
* Store a newly created quotation in the database.
* POST /api/quotations
*
* @param  \Illuminate\Http\Request  $request
* @return \Illuminate\Http\JsonResponse
*/

public function store( Request $request ) {
    // Your original validation logic
    $validator = Validator::make( $request->all(), [
        'quot_no' => 'required|string|unique:scomfort.quotation,quot_no',
        'date' => 'required|date',
        'status' => 'nullable|string|in:draft,final',
        'lead_id' => 'nullable|integer',
        'company_name' => 'nullable|string|max:255',
        'contact_person_name' => 'nullable|string|max:255',
        'contact_no' => 'nullable|string|max:20',
        'email_id' => 'nullable|email|max:255',
        'address' => 'nullable|string',
        'billing_pin_code' => 'nullable|string|max:10',
        'billing_building_no' => 'nullable|string|max:255',
        'billing_area' => 'nullable|string|max:255',
        'billing_landmark' => 'nullable|string|max:255',
        'billing_locality' => 'nullable|string|max:255',
        'billing_city' => 'nullable|string|max:255',
        'billing_state' => 'nullable|string|max:255',
        'billing_country' => 'nullable|string|max:255',
        'delivery_pin_code' => 'nullable|string|max:10',
        'delivery_building_no' => 'nullable|string|max:255',
        'delivery_area' => 'nullable|string|max:255',
        'delivery_landmark' => 'nullable|string|max:255',
        'delivery_locality' => 'nullable|string|max:255',
        'delivery_city' => 'nullable|string|max:255',
        'delivery_state' => 'nullable|string|max:255',
        'delivery_country' => 'nullable|string|max:255',
        'term_condition' => 'nullable|string',
        'customer_id' => 'required|integer|exists:scomfort.sts_company,id',

        // ESSENTIAL CHANGE FOR AUTO-SAVE: Allows saving a draft before products are added.
        'products' => 'nullable|array',
        'products.*.pro_id' => 'nullable|string|max:255',
        'products.*.qty' => 'required_with:products|numeric|min:1',
        'products.*.mrp' => 'required_with:products|numeric|min:0',
        'products.*.pro_image_path' => 'nullable|string|max:255',
        'products.*.description_head' => 'nullable|string|max:255',
        'products.*.pro_dec' => 'nullable|string',
        'products.*.hsn_code' => 'nullable|string|max:50',
        'remark' => 'nullable|string',
        'next_date' => 'nullable|date',
        'activity' => 'nullable|string',
        'packaging' => 'nullable|numeric',
        'loading' => 'nullable|numeric',
        'transport' => 'nullable|numeric',
        'unloading' => 'nullable|numeric',
        'installation' => 'nullable|numeric',
        'gst_sgst_per' => 'nullable|numeric',
        'gst_cgst_per' => 'nullable|numeric',
        'gst_igst_per' => 'nullable|numeric',
        'gst_service_sgst_per' => 'nullable|numeric',
        'gst_service_cgst_per' => 'nullable|numeric',
        'advance' => 'nullable|numeric',
        'transport_in_product' => 'nullable|numeric',
        'transport_type' => 'nullable|string|max:50',
    ] );

    if ( $validator->fails() ) {
        Log::error( 'Quotation Store Validation Failed: ', $validator->errors()->toArray() );
        return response()->json( [ 'errors' => $validator->errors() ], 422 );
    }

    $validatedData = $validator->validated();
  $textColumns = [
            'term_condition', 'transport_type', 'activity', 'remark', 'created_by', 'status',
            'quotation_status', 'installation_type', 'pro_code', 'pro_image', 'description_head',
            'pro_dec', 'hsn_code', 'size', 'size1', 'size2', 'colour', 'format', 'color1', 'color2',
            'rate_remark', 'commission_remark', 'internal_remark', 'balance_approval_sts',
            'balance_app_remark', 'advance_approval_sts', 'advance_app_remark', 'aggrement_attachment',
            'work_order_no', 'search_data'
        ];
        foreach ($textColumns as $column) {
            $validatedData[$column] = $validatedData[$column] ?? '';
        }

        $numericColumns = [
            'lead_id', 'employee_id', 'edited_by', 'edited_no_of_time', 'sorted_order', 'transport_in_product',
            'unloading', 'request_by', 'approve_by', 'commission_principle', 'commission_approval_by',
            'balance_approval_by', 'advance_approval_by', 'subtotal', 'gst_unr_status'
        ];
        foreach ($numericColumns as $column) {
            $validatedData[$column] = $validatedData[$column] ?? 0;
        }

        $dateColumns = [
            'next_date', 'edited_date', 'last_update', 'quot_temp_date', 'request_datetime', 'approval_dt',
            'commission_approval_dt', 'balance_app_date', 'advance_app_date', 'expected_delivery_date',
            'sample_return_date', 'sample_expected_delivery_date'
        ];
        foreach ($dateColumns as $column) {
            $validatedData[$column] = $validatedData[$column] ?? now();
        }

    DB::beginTransaction();
    try {
        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        // STEP 1: NAYA QUOTATION ID GENERATE KAREIN
        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        $latestQuotation = Quotation::on( 'scomfort' )->orderBy( 'quot_id', 'desc' )->first();
        $nextQuotId = ( $latestQuotation ) ? $latestQuotation->quot_id + 1 : 1;

        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        // STEP 2: COMPANY ID SAHI TARIKE SE HANDLE KAREIN
        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        $companyId = $validatedData[ 'customer_id' ] ?? null;

        if ( empty( $companyId ) && !empty( $validatedData[ 'company_name' ] ) ) {
            $company = StsCompany::firstOrCreate(
                [ 'company_name' => $validatedData[ 'company_name' ] ],
                [
                    // Aapke StsCompany table ke saare default values
                    
                    'inactive_status' => 0,
                    'merge_id' => 0,
                    'account_id' => 0,
                    'master_customer_id' => 0,
                    'contact_person' => $validatedData[ 'contact_person_name' ] ?? '',
                    
                    'contact_no1' => $validatedData[ 'contact_no' ] ?? '',
                    'contact_no2' => '',
                    'address' => $validatedData[ 'address' ] ?? '',
                    'billing_pin_code' => $validatedData[ 'billing_pin_code' ] ?? '',
                    'billing_building_no' => $validatedData[ 'billing_building_no' ] ?? '',
                    'billing_area' => $validatedData[ 'billing_area' ] ?? '',
                    'billing_landmark' => $validatedData[ 'billing_landmark' ] ?? '',
                    'billing_locality' => $validatedData[ 'billing_locality' ] ?? '',
                    'billing_city' => $validatedData[ 'billing_city' ] ?? '',
                    'billing_state' => $validatedData[ 'billing_state' ] ?? '',
                    'billing_country' => $validatedData[ 'billing_country' ] ?? '',
                    'billing_person_name' => '',
                    'billing_person_contact' => '',
                    'delivery_person_name' => '',
                    'delivery_person_contact' => '',
                    'delivery_address' => '',
                    'delivery_building_no' => $validatedData[ 'delivery_building_no' ] ?? '',
                    'delivery_area' => $validatedData[ 'delivery_area' ] ?? '',
                    'delivery_landmark' => $validatedData[ 'delivery_landmark' ] ?? '',
                    'delivery_locality' => $validatedData[ 'delivery_locality' ] ?? '',
                    'delivery_city' => $validatedData[ 'delivery_city' ] ?? '',
                    'delivery_state' => $validatedData[ 'delivery_state' ] ?? '',
                    'delivery_country' => $validatedData[ 'delivery_country' ] ?? '',
                    'city' => '',
                    'state' => '',
                    'country' => '',
                    'website' => '',
                    'email' => $validatedData[ 'email_id' ] ?? '',
                    'summary' => '',
                    'transaction_id' => '',
                    'cst_no' => '',
                    'tan_no' => '',
                    'tin_no' => '',
                    'pan_no' => '',
                    'aadhar_card' => '',
                    'pin_code' => '',
                    'customer_type' => '',
                    'opening_type' => '',
                    'opening_bal' => 0,
                    'arn_no' => '',
                    'created_id' => 0,
                    'created_date' => now(),
                    'account_approval' => 0,
                    'company_rep' => 0,
                    'edited_date_time' => now(),
                    'created_emp_id' => 0,
                    'last_workout_date' => now(),
                    'workout_type' => '',
                    'last_workout_by' => '',
                    'workout_id' => '',
                    'source_assign_by' => 0,
                    'source_generated' => '',
                    'primary_billing_address_id' => 0,
                    'primary_delivery_address_id' => 0,
                    'multiple_contact_info' => '',
                    'vendor_no' => '',
                    'location_data' => '',
                    'comp_follow_status' => '',
                    'comp_next_date' => now(),
                    'comp_activity_remark' => '',
                    'comp_activity_assign_to' => 0,
                    'comp_meeting_time' => '00:00:00',
                    'comp_meeting_date' => now(),
                    'comp_meeting_location' => '',
                    'comp_activity_order_value' => 0,
                    'comp_activity_priority' => '',
                    'comp_last_wo_date' => now(),
                    'comp_last_wo_id' => 0,
                    'comp_last_wo_no' => 0,
                    'comp_last_wo_type' => '',
                    'comp_order_data' => '',
                ]
            );
            $companyId = $company->id;
        }

        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        // STEP 3: QUOTATION KA MAIN DATA TAIYAR KAREIN
        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        $mainDetails = $validatedData;
        $mainDetails[ 'customer_id' ] = $companyId;
        $mainDetails[ 'quot_id' ] = $nextQuotId;
        $mainDetails[ 'status' ] = $validatedData[ 'status' ] ?? 'draft';

        unset( $mainDetails[ 'company_name' ] );
        $products = $mainDetails[ 'products' ] ?? [];
        unset( $mainDetails[ 'products' ] );

        $numericFields = [
            'packaging',
            'loading',
            'transport',
            'unloading',
            'installation',
            'gst_sgst_per',
            'gst_cgst_per',
            'gst_igst_per',
            'gst_service_sgst_per',
            'gst_service_cgst_per',
            'advance',
            'transport_in_product'
        ];

        foreach ( $numericFields as $field ) {
            if ( !isset( $mainDetails[ $field ] ) ) {
                $mainDetails[ $field ] = 0;
            }
        }

        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        // STEP 4: DATABASE MEIN DATA SAVE KAREIN
        // ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  ===  =
        if ( empty( $products ) ) {
            $rowData = array_merge( $this->getDefaultRowData(), $mainDetails );
            Quotation::create( $rowData );
        } else {
            foreach ( $products as $productData ) {
                $qty = $productData[ 'qty' ] ?? 1;
                $mrp = $productData[ 'mrp' ] ?? 0;
                $discount = $productData[ 'discount' ] ?? 0;
                $discount_per = $productData[ 'discount_per' ] ?? 0;
                $subtotal = $qty * $mrp;
                $calculatedTotal = $subtotal;
                if ( $discount_per > 0 ) {
                    $calculatedTotal -= ( $calculatedTotal * $discount_per / 100 );
                } else if ( $discount > 0 ) {
                    $calculatedTotal -= $discount;
                }
                $productData[ 'total' ] = round( max( 0, $calculatedTotal ), 2 );
                $productData[ 'pro_image' ] = $productData[ 'pro_image_path' ] ?? null;
                unset( $productData[ 'pro_image_path' ] );

                $rowData = array_merge(
                    $this->getDefaultRowData(),
                    $mainDetails,
                    $productData
                );
                Quotation::create( $rowData );
            }
        }

        DB::commit();

        return response()->json( [
            'message' => 'Quotation created successfully!',
            'quot_no' => $validatedData[ 'quot_no' ],
        ], 201 );

    } catch ( \Exception $e ) {
        DB::rollBack();
        Log::error( 'Failed to create quotation: ' . $e->getMessage(), [ 'exception' => $e ] );
        return response()->json( [
            'message' => 'Failed to create quotation.',
            'error' => $e->getMessage()
        ], 500 );
    }
}

/**
* Handle the standalone upload of a single image for a quotation product item.
* This endpoint is called from the frontend when 'Choose File' button is used.
* POST /api/quotation-images
*
* @param  \Illuminate\Http\Request  $request
* @return \Illuminate\Http\JsonResponse
*/

public function uploadQuotationImage( Request $request ) {
    try {
        $request->validate( [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ], [
            'image.required' => 'An image file is required.',
            'image.image' => 'The file must be an image.',
            'image.mimes' => 'Only JPEG, PNG, JPG, GIF, SVG, or WEBP images are allowed.',
            'image.max' => 'The image size must not exceed 2MB.',
        ] );

        $path = $request->file( 'image' )->store( 'quotation_images', 'public' );

        // --- FIX IS HERE ---
        // Ensure the URL is fully absolute using asset() helper
        $fullPublicUrl = asset( 'storage/' . $path );
        // Alternatively, you could do:
        // $fullPublicUrl = url( 'storage/' . $path );
        // Or manually:
        // $fullPublicUrl = config( 'app.url' ) . Storage::url( $path );
        // If Storage::url is giving relative path

        return response()->json( [
            'message' => 'Image uploaded successfully.',
            'path' => $path, // e.g., 'quotation_images/xyz.jpg'
            'url' => $fullPublicUrl // This will now be the FULL absolute URL
        ], 200 );

    } catch ( ValidationException $e ) {
        Log::error( 'Image upload validation failed: ' . $e->getMessage(), [ 'errors' => $e->errors() ] );
        return response()->json( [
            'message' => 'Validation error.',
            'errors' => $e->errors()
        ], 422 );
    } catch ( \Exception $e ) {
        Log::error( 'Quotation Image upload failed: ' . $e->getMessage(), [ 'exception' => $e ] );
        return response()->json( [
            'message' => 'Image upload failed on server.',
            'error' => $e->getMessage()
        ], 500 );
    }
}
/**
* Delete an image file associated with a quotation product item.
* DELETE /api/quotation-images
*
* @param  \Illuminate\Http\Request  $request
* @return \Illuminate\Http\JsonResponse
*/

public function deleteQuotationImage( Request $request ) {
    try {
        $request->validate( [
            'image_path' => 'required|string', // Expecting the internal path like 'quotation_images/xyz.jpg'
        ] );

        $imagePath = $request->input( 'image_path' );

        if ( Storage::disk( 'public' )->exists( $imagePath ) ) {
            Storage::disk( 'public' )->delete( $imagePath );
            return response()->json( [ 'success' => true, 'message' => 'Image deleted successfully.' ] );
        }

        return response()->json( [ 'success' => false, 'message' => 'Image not found.' ], 404 );

    } catch ( ValidationException $e ) {
        Log::error( 'Image deletion validation failed: ' . $e->getMessage(), [ 'errors' => $e->errors() ] );
        return response()->json( [
            'message' => 'Validation error.',
            'errors' => $e->errors()
        ], 422 );
    } catch ( \Exception $e ) {
        Log::error( 'Image deletion failed: ' . $e->getMessage(), [ 'exception' => $e ] );
        return response()->json( [
            'message' => 'Image deletion failed on server.',
            'error' => $e->getMessage()
        ], 500 );
    }
}

/**
* Update the specified quotation in the database by its unique quotation number ( quot_no ).
* This method handles updates by deleting existing rows and re-inserting new ones.
* PUT /api/quotations/ {
    quot_no}
    *
    * @param  \Illuminate\Http\Request  $request
    * @param  string  $quot_no
    * @return \Illuminate\Http\JsonResponse
    */

   public function update(Request $request, $quot_no)
{
    // Step 1: Complete validation rules are now included
    $validator = Validator::make($request->all(), [
        'quot_no' => [
            'required',
            'string',
            Rule::unique('scomfort.quotation', 'quot_no')->ignore($quot_no, 'quot_no'),
        ],
        'date' => 'required|date',
        'status' => 'nullable|string|in:draft,final',
        'lead_id' => 'nullable|integer',
        'company_name' => 'nullable|string|max:255',
        'contact_person_name' => 'nullable|string|max:255',
        'contact_no' => 'nullable|string|max:20',
        'email_id' => 'nullable|email|max:255',
        'address' => 'nullable|string',
        'billing_pin_code' => 'nullable|string|max:10',
        'billing_building_no' => 'nullable|string|max:255',
        'billing_area' => 'nullable|string|max:255',
        'billing_landmark' => 'nullable|string|max:255',
        'billing_locality' => 'nullable|string|max:255',
        'billing_city' => 'nullable|string|max:255',
        'billing_state' => 'nullable|string|max:255',
        'billing_country' => 'nullable|string|max:255',
        'delivery_pin_code' => 'nullable|string|max:10',
        'delivery_building_no' => 'nullable|string|max:255',
        'delivery_area' => 'nullable|string|max:255',
        'delivery_landmark' => 'nullable|string|max:255',
        'delivery_locality' => 'nullable|string|max:255',
        'delivery_city' => 'nullable|string|max:255',
        'delivery_state' => 'nullable|string|max:255',
        'delivery_country' => 'nullable|string|max:255',
        'term_condition' => 'nullable|string',
        'customer_id' => 'required|integer|exists:scomfort.sts_company,id',
        'products' => 'nullable|array',
        'products.*.pro_id' => 'nullable|string|max:255',
        'products.*.qty' => 'required_with:products|numeric|min:1',
        'products.*.mrp' => 'required_with:products|numeric|min:0',
        'products.*.pro_image_path' => 'nullable|string|max:255',
        'products.*.description_head' => 'nullable|string|max:255',
        'products.*.pro_dec' => 'nullable|string',
        'products.*.hsn_code' => 'nullable|string|max:50',
        'remark' => 'nullable|string',
        'next_date' => 'nullable|date',
        'activity' => 'nullable|string',
        'packaging' => 'nullable|numeric',
        'loading' => 'nullable|numeric',
        'transport' => 'nullable|numeric',
        'unloading' => 'nullable|numeric',
        'installation' => 'nullable|numeric',
        'gst_sgst_per' => 'nullable|numeric',
        'gst_cgst_per' => 'nullable|numeric',
        'gst_igst_per' => 'nullable|numeric',
        'gst_service_sgst_per' => 'nullable|numeric',
        'gst_service_cgst_per' => 'nullable|numeric',
        'advance' => 'nullable|numeric',
        'transport_in_product' => 'nullable|numeric',
        'transport_type' => 'nullable|string|max:50',
    ]);

    if ($validator->fails()) {
        Log::error('Quotation Update/Create Validation Failed: ', $validator->errors()->toArray());
        return response()->json(['errors' => $validator->errors()], 422);
    }

    $validatedData = $validator->validated();
    
    $textColumns = [
    'term_condition', 'transport_type', 'activity', 'remark', 'created_by', 'status',
    'quotation_status', 'installation_type', 'pro_code', 'pro_image', 'description_head',
    'pro_dec', 'hsn_code', 'size', 'size1', 'size2', 'colour', 'format', 'color1', 'color2',
    'rate_remark', 'commission_remark', 'internal_remark', 'balance_approval_sts',
    'balance_app_remark', 'advance_approval_sts', 'advance_app_remark', 'aggrement_attachment',
    'work_order_no', 'search_data'
];
foreach ($textColumns as $column) {
    $validatedData[$column] = $validatedData[$column] ?? '';
}
    // 👇 YEH POORA BLOCK ADD KARNA HAI 👇
 $numericColumns = [
    'lead_id', 'packaging', 'loading', 'transport', 'unloading',
    'installation', 'gst_sgst_per', 'gst_cgst_per', 'gst_igst_per',
    'gst_service_sgst_per', 'gst_service_cgst_per', 'advance',
    'transport_in_product', 'employee_id', 'edited_by',
    'edited_no_of_time', 'sorted_order', 'request_by', 'approve_by',
    'commission_principle', 'commission_approval_by', 'balance_approval_by',
    'advance_approval_by', 'subtotal', 'gst_unr_status'
];
foreach ($numericColumns as $column) {
    $validatedData[$column] = $validatedData[$column] ?? 0;
}

  $dateColumns = [
            'next_date', 'edited_date', 'last_update', 'quot_temp_date', 'request_datetime', 'approval_dt',
            'commission_approval_dt', 'balance_app_date', 'advance_app_date', 'expected_delivery_date',
            'sample_return_date', 'sample_expected_delivery_date'
        ];
        foreach ($dateColumns as $column) {
            $validatedData[$column] = $validatedData[$column] ?? now();
        }

    DB::beginTransaction();
    try {
        // Step 2: Check if the quotation exists
        $existingQuotation = Quotation::on('scomfort')->where('quot_no', $quot_no)->first();

        if ($existingQuotation) {
            // IF IT EXISTS: Normal update path. Get its quot_id and delete old rows.
            $quotIdToUse = $existingQuotation->quot_id;
            Quotation::on('scomfort')->where('quot_no', $quot_no)->delete();
        } else {
            // IF IT DOES NOT EXIST: Create path. Generate a new quot_id.
            $latest = Quotation::on('scomfort')->orderBy('quot_id', 'desc')->first();
            $quotIdToUse = ($latest) ? $latest->quot_id + 1 : 1;
        }

        // Step 3: Handle Company ID (This is your original logic, it's correct)
        $companyId = $validatedData['customer_id'] ?? null;
        if (empty($companyId) && !empty($validatedData['company_name'])) {
            $company = StsCompany::firstOrCreate(
                ['company_name' => $validatedData['company_name']],
                [
                    'inactive_status' => 0, 'merge_id' => 0, 'account_id' => 0,
                    'master_customer_id' => 0, 'contact_person' => $validatedData['contact_person_name'] ?? '',
                    'contact_no1' => $validatedData['contact_no'] ?? '', 'contact_no2' => '',
                    'address' => $validatedData['address'] ?? '', 'email' => $validatedData['email_id'] ?? '',
                    'billing_pin_code' => $validatedData['billing_pin_code'] ?? '',
                    'billing_building_no' => $validatedData['billing_building_no'] ?? '',
                    'billing_area' => $validatedData['billing_area'] ?? '',
                    'billing_landmark' => $validatedData['billing_landmark'] ?? '',
                    'billing_locality' => $validatedData['billing_locality'] ?? '',
                    'billing_city' => $validatedData['billing_city'] ?? '',
                    'billing_state' => $validatedData['billing_state'] ?? '',
                    'billing_country' => $validatedData['billing_country'] ?? '',
                    'delivery_pin_code' => $validatedData['delivery_pin_code'] ?? '',
                    'delivery_building_no' => $validatedData['delivery_building_no'] ?? '',
                    'delivery_area' => $validatedData['delivery_area'] ?? '',
                    'delivery_landmark' => $validatedData['delivery_landmark'] ?? '',
                    'delivery_locality' => $validatedData['delivery_locality'] ?? '',
                    'delivery_city' => $validatedData['delivery_city'] ?? '',
                    'delivery_state' => $validatedData['delivery_state'] ?? '',
                    'delivery_country' => $validatedData['delivery_country'] ?? '',
                    'created_date' => now(), 'edited_date_time' => now(), 'last_workout_date' => now(),
                    // Add other defaults as necessary to prevent SQL errors
                ]
            );
            $companyId = $company->id;
        }

        // Step 4: Create/re-create the quotation rows
        $mainDetails = $validatedData;
        $mainDetails['customer_id'] = $companyId;
        $mainDetails['status'] = $validatedData['status'] ?? 'draft';
        $mainDetails['quot_id'] = $quotIdToUse;

        unset($mainDetails['company_name']);
        $products = $mainDetails['products'] ?? [];
        unset($mainDetails['products']);

        $defaultRowData = $this->getDefaultRowData();

        if (empty($products)) {
            $rowData = array_merge($defaultRowData, $mainDetails);
            Quotation::create($rowData);
        } else {
            foreach ($validatedData['products'] as $productData) {
                // Your product calculation logic
                $qty = $productData['qty'] ?? 1;
                $mrp = $productData['mrp'] ?? 0;
                $discount = $productData['discount'] ?? 0;
                $discount_per = $productData['discount_per'] ?? 0;
                $subtotal = $qty * $mrp;
                $calculatedTotal = $subtotal;
                if ($discount_per > 0) {
                    $calculatedTotal -= ($calculatedTotal * $discount_per / 100);
                } elseif ($discount > 0) {
                    $calculatedTotal -= $discount;
                }
                $productData['total'] = round(max(0, $calculatedTotal), 2);
                $productData['pro_image'] = $productData['pro_image_path'] ?? null;
                unset($productData['pro_image_path']);

                $rowData = array_merge($defaultRowData, $mainDetails, $productData);
                Quotation::create($rowData);
            }
        }

        DB::commit();

        return response()->json([
            'message' => 'Quotation saved successfully!',
            'quot_no' => $validatedData['quot_no'],
            'status' => $validatedData['status'] ?? 'draft'
        ], 200);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Failed to save quotation in update/create logic: ', ['error' => $e->getMessage()]);
        return response()->json(['message' => 'Failed to save quotation on the server.', 'error' => $e->getMessage()], 500);
    }
}

    // in app/Http/Controllers/QuotationController.php

    /**
     * Fetch all parent product categories.
     */
    // in app/Http/Controllers/QuotationController.php

    /**
     * Fetch all parent product categories.
     */


    /**
     * Delete the specified quotation from the database by its unique quotation number.
     * DELETE /api/quotations/{quot_no}
     *
     * @param  string  $quot_no
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($quot_no)
    {
        // Optional: Before deleting quotation rows, you might want to delete their associated images.
        // This requires fetching the rows first to get their 'pro_image' paths.
        // For simplicity, this example doesn't automatically delete images upon quotation deletion,
            // as the 'deleteQuotationImage' endpoint is meant for specific image removal.

            $deletedCount = Quotation::where( 'quot_no', $quot_no )->delete();

            if ( $deletedCount > 0 ) {
                return response()->json( [ 'message' => 'Quotation deleted successfully!' ] );
            }

            return response()->json( [ 'message' => 'Quotation not found' ], 404 );
        }

        /**
        * Provides an array of default values for all quotation columns.
        * This is crucial to ensure all necessary columns are present when creating/updating rows
        * in your wide 'quotation' table, preventing 'column not found' errors.
        *
        * @return array
        */

        private function getDefaultRowData() {

           $lastRecord = Quotation::on('scomfort')->orderBy('id', 'desc')->first();
    $nextId = ($lastRecord) ? $lastRecord->id + 1 : 1;

            return [
                // <<< YAHAN PAR CHANGE KIYA GAYA HAI >>>
                 // Added default value for the 'id' field

                // Numerical/ID fields - Set sensible defaults ( 0 or null )
                'id' => $nextId,
                'lead_id' => 0,
                'quot_id' => null,
                'customer_id' => 0,
                'sorted_order' => 0,
                'transport_in_product' => 0,
                'unloading' => 0,
                'employee_id' => 0,
                'verson' => 0,
                'edited_quot_id' => 0,
                'edited_by' => 0,
                'edited_no_of_time' => 0,
                'request_by' => 0,
                'approve_by' => 0,
                'commission_principle' => 0,
                'commission_approval_by' => 0,
                'gst_unr_status' => 0,
                'balance_approval_by' => 0,
                'advance_approval_by' => 0,
                'qty' => 0,
                'mrp' => 0,
                'total' => 0,
                'subtotal' => 0,
                'discount_per' => 0,
                'discount' => 0,
                'lbt_per' => 0,
                'lbt' => 0,
                'oct_per' => 0,
                'oct' => 0,
                'vat_per' => 0,
                'vat' => 0,
                'cst_per' => 0,
                'cst' => 0,
                'gst_sgst_per' => 0,
                'gst_sgst' => 0,
                'gst_cgst_per' => 0,
                'gst_cgst' => 0,
                'gst_igst_per' => 0,
                'gst_igst' => 0,
                'gst_service_sgst_per' => 0,
                'gst_service_sgst' => 0,
                'gst_service_cgst_per' => 0,
                'gst_service_cgst' => 0,
                'grand_total' => 0,
                'advance' => 0,
                'balance' => 0,
                'commission_per' => 0,
                'commission_amount' => 0,
                's_no' => 1, 
                // String/Text fields - Set sensible defaults ( empty strings or 'no' for flags )
                'type' => 'Lead',
                'created_source' => 'WEBERP',
                'commission_sts' => 'no',
                'quot_no' => '',
                'contact_person_name' => '',
                'contact_no' => '',
                'email_id' => '',
                'address' => '',
                'billing_pin_code' => '',
                'billing_building_no' => '',
                'billing_area' => '',
                'billing_landmark' => '',
                'billing_locality' => '',
                'billing_city' => '',
                'billing_state' => '',
                'billing_country' => '',
                'delivery_pin_code' => '',
                'delivery_building_no' => '',
                'delivery_area' => '',
                'delivery_landmark' => '',
                'delivery_locality' => '',
                'delivery_city' => '',
                'delivery_state' => '',
                'delivery_country' => '',
                'term_condition' => '',
                'quotation_sub' => '',
                'pro_id' => '',
                'pro_code' => '',
                'pro_image' => '',
                'description_head' => '',
                'pro_dec' => '',
                'hsn_code' => '',
                'size' => '',
                'size1' => '',
                'size2' => '',
                'colour' => '',
                'transport' => '',
                'transport_type' => '',
                'installation' => '',
                'installation_type' => '',
                'packaging' => '',
                'loading' => '',
                'mathadi' => '',
                'quotation_status' => '',
                'activity' => '',
                'remark' => '',
                'format' => '',
                'created_by' => '',
                'bolt' => '',
                'handel' => '',
                'base' => '',
                'color' => '',
                'color1' => '',
                'color2' => '',
                'mechanism' => '',
                'fabric' => '',
                'size_dec' => '',
                'mould' => '',
                'foam' => '',
                'foam_thickness' => '',
                'foam_density' => '',
                'coating_color' => '',
                'board_thickness' => '',
                'board_color' => '',
                'edge_bin_color' => '',
                'edge_bin_thickness' => '',
                'wheels' => '',
                'wooden_shell' => '',
                'fiber_shell' => '',
                'pipe_size' => '',
                'pipe_thickness' => '',
                'glass_size' => '',
                'glass_thick' => '',
                'metal_sheet_thick' => '',
                'partition_size' => '',
                'partition_thick' => '',
                'steel_plate' => '',
                'steel_shell' => '',
                'perforated_shell' => '',
                'perforated_sheet' => '',
                'granite_color' => '',
                'granite_thick' => '',
                'polish_color' => '',
                'solid_wood_thick' => '',
                'glass' => '',
                'hydraulic' => '',
                'seat' => '',
                'thickness' => '',
                'wheel' => '',
                'wood' => '',
                'product_temp_id' => '',
                'quot_temp_id' => '',
                'approval_status' => '',
                'approval_remark' => '',
                'rate_status' => '',
                'rate_remark' => '',
                'ledger_id' => '',
                'commission_remark' => '',
                'commission_approval_sts' => '',
                'commission_approval_remark' => '',
                'internal_remark' => '',
                'attachment' => '',
                'allover_discount_per' => '',
                'allover_discount' => '',
                'credite_terms' => '',
                'declaration_status' => '',
                'wo_type' => '',
                'wo_created_type' => '',
                'work_order_id' => '',
                'work_order_no' => '',
                'search_data' => '',
                'balance_approval_sts' => '',
                'balance_app_remark' => '',
                'advance_approval_sts' => '',
                'advance_app_remark' => '',
                'aggrement_attachment' => '',

                // Flag fields ( tinyInteger defaults )
                'modular' => 0,
                'fabrication' => 0,
                'chairs' => 0,
                'sofa' => 0,
                'side_job' => 0,
                'coating' => 0,
                'production_glass' => 0,
                'polish' => 0,
                'metal_storage' => 0,
                'modular_partition' => 0,
                'raceway_bending' => 0,
                'ledger_perfo' => 0,
                'chairs_service' => 0,
                'modular_service' => 0,
                'last_update' => now(),

                // Date/Datetime fields ( null defaults )
                'date' => null,
                'next_date' => null,
                'edited_date' => null,
                'quot_temp_date' => null,
                'request_datetime' => null,
                'approval_dt' => null,
                'commission_approval_dt' => null,
                'balance_app_date' => null,
                'advance_app_date' => null,
                'expected_delivery_date' => null,
                'sample_return_date' => null,
                'sample_expected_delivery_date' => null,
                
                // Serial number field
            ];
        }
    }