<?php

namespace App\Http\Controllers;

use App\Models\StsCompany;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB; // If you need transactions, though not strictly required for a single delete

class StsCompanyController extends Controller
{
    // ... other methods like index, show, store, update for StsCompany if you have them ...

    /**
     * Delete the specified company from the database.
     * DELETE /api/companies/{id}
     *
     * @param  int  $id The ID of the company to delete
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            // Find the company by its primary key (id)
            $company = StsCompany::find($id);

            if (!$company) {
                Log::warning("Company not found for ID: " . $id);
                return response()->json(['message' => 'Company not found.'], 404);
            }


            $company->delete();

            Log::info("Company deleted successfully. ID: " . $id);
            return response()->json(['message' => 'Company deleted successfully!'], 200);

        } catch (\Exception $e) {
            Log::error('Failed to delete company: ' . $e->getMessage(), ['exception' => $e, 'company_id' => $id]);
            return response()->json(['message' => 'Failed to delete company.', 'error' => $e->getMessage()], 500);
        }

    }

   
  public function search(Request $request)
{
    try {
        $query = $request->query('q');

        if (!$query) {
            return response()->json([]);
        }

        // ✅ यहाँ पर बदलाव करें
        // select() method में सभी आवश्यक fields को जोड़ें
        $companies = StsCompany::query()
            ->select('id', 'company_name', 'contact_person', 'contact_no1', 'email')
            ->where('company_name', 'LIKE', '%' . $query . '%')
            ->limit(10)
            ->get();

        return response()->json($companies);

    } catch (\Exception $e) {
        Log::error('Failed to search for companies: ' . $e->getMessage());
        return response()->json(['message' => 'Failed to search for companies.'], 500);
    }
}

 public function index()
    {
        try {
            // Ek baar mein 25 companies fetch karein. Aap is number ko badal sakte hain.
            // Hum sirf zaroori columns select kar rahe hain taaki API fast rahe.
            $companies = StsCompany::select('id', 'company_name', 'city', 'contact_person')
                                   ->orderBy('company_name', 'asc') // Naam se sort kar diya
                                   ->paginate(25); // <-- YEH PAGINATION KA JAADU HAI

            return response()->json($companies);

        } catch (\Exception $e) {
            Log::error('Failed to fetch companies: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch companies.'], 500);
        }
    }


}