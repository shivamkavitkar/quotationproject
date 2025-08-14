<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\StsCompanyController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider and will be assigned
| to the "api" middleware group.
|
*/


Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});


Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::put('/products/{product}', [ProductController::class, 'update']);
Route::post('/products/{product}/upload-image', [ProductController::class, 'updateProductImage']);
Route::put('/products/{product}/specifications', [ProductController::class, 'updateProductSpecifications']);
Route::get('/products/{productId}/sub-products', [ProductController::class, 'getSubProducts']);






Route::get('/quotations', [QuotationController::class, 'index']);


Route::post('/quotations', [QuotationController::class, 'store']);


// routes/api.php
// New, more explicit route
Route::get('/quotations/{quot_no}', [QuotationController::class, 'show'])
    ->where('quot_no', '.*');


Route::put('/quotations/{quot_no}', [QuotationController::class, 'update'])->where('quot_no', '.*'); // Yahan bhi .where() add karein
Route::delete('/quotations/{quot_no}', [QuotationController::class, 'destroy'])->where('quot_no', '.*'); // Yahan bhi .where() add karein


Route::post('/products', [ProductController::class, 'store']);




Route::post('/quotation-images', [QuotationController::class, 'uploadQuotationImage']);


Route::delete('/quotation-images', [QuotationController::class, 'deleteQuotationImage']);


// routes/api.php

Route::delete('/companies/{id}', [StsCompanyController::class, 'destroy']); // New route for company deletion

Route::get('/companies/search', [StsCompanyController::class, 'search']);

Route::get('/companies', [StsCompanyController::class, 'index']);

// in routes/api.php

// Add these two routes
// in routes/api.php
Route::get('/categories', [ProductController::class, 'getCategories']);
Route::get('/categories/{categoryId}/subcategories', [ProductController::class, 'getSubcategories']);


// Add this line to your routes/api.php

Route::get('/companies/autocomplete', [App\Http\Controllers\StsCompanyController::class, 'autocomplete']);