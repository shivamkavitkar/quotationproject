<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Intervention\Image\ImageManagerStatic as Image; // <--- Ensure this is correctly installed and PHP extensions are enabled
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB; // Add this for specific validation error handling
use Illuminate\Support\Facades\Log;
// Add this for logging errors

class ProductController extends Controller
{
    /**
     * Display a listing of the products.
     * Handles pagination and search functionality.
     * GET /products
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Product::query();
        $search = $request->input('search');

        // Logic to handle global vs. filtered search
        if ($request->has('global_search')) {
            // Global search logic
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('code', 'like', '%' . $search . '%');
                });
            }
        } else {
            // Filtered search logic
            if ($search) {
                $query->where('name', 'like', '%' . $search . '%');
            }
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->input('category_id'));
            }
            if ($request->filled('subcategory_id')) {
                $query->where('subcategory_id', $request->input('subcategory_id'));
            }
        }

        $query->orderBy('product_id', 'asc')->with(['category', 'subcategory']);

        // 1. Fetch a limited collection using get()
        $products = $query->limit(20)->get();

        // <<< FIX IS HERE >>>
        // 2. Transform the collection directly (no getCollection())
        //    Using map() is slightly cleaner as it returns a new collection.
        $formattedProducts = $products->map(function ($product) {
            return [
                'product_id' => $product->product_id,
                'name' => $product->name,
                'price' => $product->price,
                'hsn_code' => $product->hsn_code,
                'picture' => $product->picture,
                'category_id' => $product->category_id,
                'subcategory_id' => $product->subcategory_id,
                'category_name' => $product->category?->category_name,
                'subcategory_name' => $product->subcategory?->subcategory_name,
            ];
        });

        // 3. Return the newly formatted data in a clean JSON structure
        return response()->json(['data' => $formattedProducts]);
    }

    /**
     * Display the specified product.
     * Uses Route Model Binding.
     * GET /products/{product}
     *
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Product $product)
    {
        $product->load(['category', 'subcategory']);

        // --- FIX FOR IMAGE URL IN SHOW ---
        $imagePathInDb = $product->picture;
        if ($imagePathInDb && !str_starts_with($imagePathInDb, 'http')) {
            $product->picture_full_url = asset('storage/' . $imagePathInDb);
        } else {
            $product->picture_full_url = $imagePathInDb;
        }
        // --- END FIX ---

        return response()->json(['product' => $product]);
    }

    /**
     * Update product specifications for a specific product (inline in table).
     * PUT /products/{product}/specifications
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProductSpecifications(Request $request, Product $product)
    {
        $validator = Validator::make($request->all(), [
            'size' => 'nullable|string|max:255',
            'length' => 'nullable|string|max:255',
            'width' => 'nullable|string|max:255',
            'height' => 'nullable|numeric',
            'price' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $newSpecifications = $validator->validated();

        $newSpecifications['height'] = isset($newSpecifications['height']) && $newSpecifications['height'] !== '' ? (float) $newSpecifications['height'] : null;
        $newSpecifications['price'] = isset($newSpecifications['price']) && $newSpecifications['price'] !== '' ? (float) $newSpecifications['price'] : null;

        $product->specification_value = $newSpecifications;
        $product->save();

        return response()->json([
            'message' => 'Product specifications updated successfully!',
            'product' => $product
        ], 200);
    }

    /**
     * Update the product image for a specific product.
     * POST /products/{product}/upload-image
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProductImage(Request $request, Product $product)
    {
        try {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048', // Still validate image type and size
            ], [
                'image.required' => 'An image file is required.',
                'image.image' => 'The file must be an image.',
                'image.mimes' => 'Only JPEG, PNG, JPG, GIF, SVG, or WEBP images are allowed.',
                'image.max' => 'The image size must not exceed 2MB.',
            ]);

            if ($request->hasFile('image')) {
                $originalImage = $request->file('image');
                $directory = 'uploads/product_images'; // Define directory here

                // Generate a unique filename using Str::random or a timestamp
                // It's better to get the client's original extension directly for reliability
                $extension = $originalImage->getClientOriginalExtension();
                $filename = Str::random(40) . '.' . $extension; // Generate a random, unique filename
                $fullPath = $directory . '/' . $filename; // Full path for storage

                // Delete old image if it exists and is not null/empty
                if ($product->picture) {
                    // Ensure the path is correct before deleting.
                    // This assumes $product->picture stores the path like 'uploads/product_images/old_image.jpg'
                    if (Storage::disk('public')->exists($product->picture)) {
                        Storage::disk('public')->delete($product->picture);
                    }
                }

                // Store the image directly without Intervention/Image processing
                // This saves the original uploaded file to storage/app/public/uploads/product_images
                Storage::disk('public')->put($fullPath, file_get_contents($originalImage->getRealPath()));

                // Update product record with the new image path
                $product->picture = $fullPath; // Store the full relative path (e.g., 'uploads/product_images/filename.jpg')
                $product->save();

                // Generate the full public URL for the frontend response
                $fullPublicUrl = asset('storage/' . $fullPath);

                return response()->json([
                    'message' => 'Product image updated successfully',
                    'image_path' => $fullPath,    // The path stored in DB
                    'image_filename' => $filename, // Just the filename
                    'full_url' => $fullPublicUrl,  // The full URL for frontend display
                    'product' => $product // Optionally return updated product
                ], 200);
            }

            return response()->json(['message' => 'No image file provided'], 400);

        } catch (ValidationException $e) {
            Log::error('Product Image upload validation failed: ' . $e->getMessage(), ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation error.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Product Image upload failed: ' . $e->getMessage(), ['exception' => $e, 'file' => $e->getFile(), 'line' => $e->getLine(), 'trace' => $e->getTraceAsString()]);
            // Detailed error for debugging, remove for production
            return response()->json([
                'message' => 'Product image upload failed on server.',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Update the specified product in storage (from the full edit form).
     * PUT /products/{product}
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, Product $product)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:product,code,' . $product->product_id . ',product_id',
            'price' => 'nullable|numeric|min:0',
            'category_id' => 'nullable|integer|exists:categories,id',
            'subcategory_id' => 'nullable|integer|exists:subcategories,id',
            'current_stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'specification_value' => 'nullable|array',
            'specification_value.size' => 'nullable|string|max:50',
            'specification_value.length' => 'nullable|string|max:50',
            'specification_value.width' => 'nullable|string|max:50',
            'specification_value.height' => 'nullable|numeric|min:0',
            'specification_value.price' => 'nullable|numeric|min:0',
            // Allow picture to be null or string path if it's not being re-uploaded
            'picture' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        $dataToUpdate = [
            'name' => $validatedData['name'],
            'code' => $validatedData['code'] ?? null,
            'price' => isset($validatedData['price']) && $validatedData['price'] !== '' ? (float) $validatedData['price'] : null,
            'category_id' => $validatedData['category_id'] ?? null,
            'subcategory_id' => $validatedData['subcategory_id'] ?? null,
            'current_stock' => isset($validatedData['current_stock']) && $validatedData['current_stock'] !== '' ? (int) $validatedData['current_stock'] : null,
            'description' => $validatedData['description'] ?? null,
        ];

        // Handle specification_value separately as it's a nested array for JSON column
        $specValues = $validatedData['specification_value'] ?? [];
        $specValues['height'] = isset($specValues['height']) && $specValues['height'] !== '' ? (float) $specValues['height'] : null;
        $specValues['price'] = isset($specValues['price']) && $specValues['price'] !== '' ? (float) $specValues['price'] : null;
        $dataToUpdate['specification_value'] = $specValues;

        // If 'picture' is sent in the update request body, ensure it's handled (e.g., if null for deletion)
        if (array_key_exists('picture', $validatedData)) {
            $dataToUpdate['picture'] = $validatedData['picture'];
        }

        $product->fill($dataToUpdate);
        $product->save();

        return response()->json([
            'message' => 'Product updated successfully!',
            'product' => $product
        ], 200);
    }

    /**
     * Placeholder for sub-products logic.
     * GET /products/{productId}/sub-products
     *
     * @param  int  $productId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSubProducts($productId)
    {
        return response()->json(['message' => "Sub-products for product ID $productId (logic not implemented)"]);
    }

    /**
     * Get all categories.
     * GET /categories
     *
     * @return \Illuminate\Http\JsonResponse
     */
    // in app/Http/Controllers/ProductController.php

    /**
     * Get all categories.
     */
    public function getCategories()
    {
        // This uses the Category model which is correctly linked to your database.
        $categories = \App\Models\Category::orderBy('category_name', 'asc')
            ->get(['id', 'category_name']);

        return response()->json(['data' => $categories]);
    }

    /**
     * Get subcategories for a given category.
     */
    public function getSubcategories($categoryId)
    {
        // This uses the Subcategory model which is correctly linked.
        $subcategories = \App\Models\Subcategory::where('category_id', $categoryId)
            ->orderBy('subcategory_name', 'asc')
            ->get(['id', 'subcategory_name']);

        return response()->json(['data' => $subcategories]);
    }


    // in app/Http/Controllers/ProductController.php

    /**
     * Store a newly created product in storage.
     * POST /api/products
     */
    // in app/Http/Controllers/ProductController.php

    /**
     * Store a newly created product in storage.
     * POST /api/products
     */
// in app/Http/Controllers/ProductController.php

// in app/Http/Controllers/ProductController.php

public function store(Request $request)
{
    // 1. Validation
    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
        'category_id' => 'required|integer',
        'subcategory_id' => 'required|integer',
        'price' => 'required|numeric',
        'hsn_code' => 'nullable|string',
        'description' => 'nullable|string',
        'picture' => 'nullable|string',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }
    $validatedData = $validator->validated();

    // Find the names for the IDs provided
    $category = \App\Models\Category::find($validatedData['category_id']);
    $subcategory = \App\Models\Subcategory::find($validatedData['subcategory_id']);

    DB::beginTransaction();
    try {
        // <<< FIX IS HERE: ADDED ALL REQUIRED DEFAULT VALUES >>>
        $newProduct = Product::create([
            // Data from the frontend form
            'name' => $validatedData['name'],
            'category_id' => $validatedData['category_id'],
            'subcategory_id' => $validatedData['subcategory_id'],
            'category_name' => $category->category_name ?? '',
            'subcategory_name' => $subcategory->subcategory_name ?? '',
            'price' => $validatedData['price'],
            'hsn_code' => $validatedData['hsn_code'] ?? '',
            'description' => $validatedData['description'] ?? '',
            'picture' => $validatedData['picture'] ?? '',

            // --- Defaults for ALL other NOT NULL columns from your table structure ---
            'code' => '0',
            'code_no' => 0,
            'type' => 'PRODUCT',
            'production_type' => 'CUSTOMIZED',
            'sgst_per' => '', 'cgst_per' => '', 'igst_per' => '',
            'service_sgst' => '', 'service_cgst' => '',
            'mini_level' => 0,
            'min_price' => 0,
            'color' => '', 'color1' => '', 'color2' => '',
            'size' => '', 'size1' => '', 'size2' => '',
            'thickness' => '', 'seater' => '',
            'lenght' => 0, 'width' => 0, 'height_min' => 0, 'height_max' => 0, 'depth' => 0, 'weight' => 0,
            'created_by' => 0,
            'created_date_time' => now(),
            'delete_status' => 0,
            'delete_by' => 0,
            'delete_datetime' => now(),
            'pro_base_status' => 0, 'pro_handle_status' => 0, 'pro_hydraulic_status' => 0,
            'pro_wheels_status' => 0, 'pro_mould_status' => 0, 'pro_mechanism_status' => 0,
            'pro_foam_density_status' => 0, 'pro_foam_thick_status' => 0, 'pro_wooden_shell_status' => 0,
            'pro_fiber_shell_status' => 0, 'pro_size_status' => 0, 'pro_size_status1' => 0,
            'pro_size_status2' => 0, 'pro_pipe_size_status' => 0, 'pro_pipe_thick_status' => 0,
            'pro_fabric_status' => 0, 'pro_color_status' => 0, 'pro_color_status1' => 0,
            'pro_color_status2' => 0, 'pro_coating_color_status' => 0, 'pro_board_color_status' => 0,
            'pro_board_thick_status' => 0, 'pro_edge_bin_thick_status' => 0, 'pro_edge_bin_color_status' => 0,
            'pro_metal_sheet_thick_status' => 0, 'pro_glass_size_status' => 0, 'pro_glass_thick_status' => 0,
            'pro_partition_size_status' => 0, 'pro_partition_thick_status' => 0,
            'pro_steel_plate_status' => '', 'pro_steel_shell_status' => '', 'pro_perforated_shell_status' => '',
            'pro_perforated_sheet_status' => 0, 'pro_granite_color_status' => 0, 'pro_granite_thick_status' => 0,
            'pro_polish_color_status' => 0, 'pro_solid_wood_thick_status' => 0,
            'bolt' => '', 'handel' => '', 'base' => '', 'armrest' => '', 'color_dec' => '', 'framrest' => '',
            'mechanism' => '', 'fabric' => '', 'size_dec' => '', 'mould' => '', 'foam' => '', 'transport_type' => '',
            'foam_thickness' => '', 'foam_density' => 0, 'coating_color' => '', 'board_thickness' => '',
            'board_color' => '', 'edge_bin_color' => '', 'edge_bin_thickness' => '', 'wheels' => '',
            'wooden_shell' => '', 'fiber_shell' => '', 'pipe_size' => '', 'pipe_thickness' => '',
            'glass_size' => '', 'glass_thick' => '', 'metal_sheet_thick' => '', 'partition_size' => '',
            'partition_thick' => '', 'steel_plate' => '', 'steel_shell' => '', 'perforated_shell' => '',
            'perforated_sheet' => '', 'granite_color' => '', 'granite_thick' => '', 'polish_color' => '',
            'solid_wood_thick' => '', 'glass' => '', 'hydraulic' => '', 'iron' => '', 'powdercoating' => '',
            'seat' => '', 'thickness_dec' => '', 'wheel' => '', 'wood' => '',
            'stock_created_by' => '',
            'stock_created_date' => now(),
            'current_stock_location' => '',
            'current_stock' => 0,
            'search_data' => '',
            'specification' => '',
            'specification_value' => '',
            'desc_head' => '',
            'product_description' => '',
            'dec_json' => ''
        ]);

        DB::commit();
        $newProduct->load(['category', 'subcategory']);
        return response()->json(['message' => 'Product created successfully!', 'data' => $newProduct], 201);
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Product creation failed: ' . $e->getMessage());
        return response()->json(['message' => 'Failed to create product.', 'error' => $e->getMessage()], 500);
    }
}
}