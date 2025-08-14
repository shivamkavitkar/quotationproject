<?php

namespace App\Http\Controllers;

use App\Models\StsCompany;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
// If you need transactions, though not strictly required for a single delete

class StsCompanyController extends Controller {
    // ... other methods like index, show, store, update for StsCompany if you have them ...

    /**
    * Delete the specified company from the database.
    * DELETE /api/companies/
        *
        * @param  int  $id The ID of the company to delete
        * @return \Illuminate\Http\JsonResponse
        */

        public function destroy( $id ) {
            try {

                $company = StsCompany::find( $id );

                if ( !$company ) {
                    Log::warning( 'Company not found for ID: ' . $id );
                    return response()->json( [ 'message' => 'Company not found.' ], 404 );
                }

                $company->delete();

                Log::info( 'Company deleted successfully. ID: ' . $id );
                return response()->json( [ 'message' => 'Company deleted successfully!' ], 200 );

            } catch ( \Exception $e ) {
                Log::error( 'Failed to delete company: ' . $e->getMessage(), [ 'exception' => $e, 'company_id' => $id ] );
                return response()->json( [ 'message' => 'Failed to delete company.', 'error' => $e->getMessage() ], 500 );
            }

        }

        public function search( Request $request ) {
            try {
                $query = $request->query( 'q' );

                if ( !$query ) {
                    return response()->json( [] );
                }

                $companies = StsCompany::query()
                ->select( 'id', 'company_name', 'contact_person', 'contact_no1', 'email' )
                ->where( 'company_name', 'LIKE', '%' . $query . '%' )
                ->limit( 10 )
                ->get();

                return response()->json( $companies );

            } catch ( \Exception $e ) {
                Log::error( 'Failed to search for companies: ' . $e->getMessage() );
                return response()->json( [ 'message' => 'Failed to search for companies.' ], 500 );
            }
        }

        public function index( Request $request ) {
            try {
                $searchQuery = $request->query( 'search' );

                // Start building the query
                $query = StsCompany::query()->select(
                    'id',
                    'company_name',
                    'city',
                    'contact_person',
                    'contact_no1',
                    'billing_pin_code',
                    'billing_state'
                )
                ->whereNotNull( 'company_name' )
                ->where( 'company_name', '!=', '' );

                if ( $searchQuery ) {
                    $query->where( 'company_name', 'LIKE', '%' . $searchQuery . '%' );
                }

                // The rest of the logic remains the same
                $companies = $query->orderBy( 'company_name', 'asc' )->paginate( 25 );

                return response()->json( $companies );

            } catch ( \Exception $e ) {
                Log::error( 'Failed to fetch companies: ' . $e->getMessage() );
                return response()->json( [ 'message' => 'Failed to fetch companies.' ], 500 );
            }
        }

        // Add this new method to your StsCompanyController.php file

        public function autocomplete( Request $request ) {
            try {
                $query = $request->query( 'q' );

                if ( strlen( $query ) < 2 ) {
                    // Start searching only after 2 characters
                    return response()->json( [] );
                }

                $companies = StsCompany::query()
                ->select( 'id', 'company_name' )
                ->whereNotNull( 'company_name' )
                ->where( 'company_name', 'LIKE', '%' . $query . '%' )
                ->limit( 10 ) // Limit to 10 results for the dropdown
                ->get();

                return response()->json( $companies );

            } catch ( \Exception $e ) {
                Log::error( 'Autocomplete search failed: ' . $e->getMessage() );
                return response()->json( [ 'message' => 'Autocomplete search failed.' ], 500 );
            }
        }

    }


    