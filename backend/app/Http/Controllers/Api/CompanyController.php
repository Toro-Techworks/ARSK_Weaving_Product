<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $companies = Company::query()
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%"))
            ->orderBy('company_name')
            ->paginate($perPage);

        return response()->json([
            'data' => CompanyResource::collection($companies),
            'meta' => [
                'current_page' => $companies->currentPage(),
                'last_page' => $companies->lastPage(),
                'per_page' => $companies->perPage(),
                'total' => $companies->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);

        $company = Company::create($validated);
        return response()->json(['data' => new CompanyResource($company)], 201);
    }

    public function show(Company $company): JsonResponse
    {
        return response()->json(['data' => new CompanyResource($company)]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'gst_number' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);

        $company->update($validated);
        return response()->json(['data' => new CompanyResource($company->fresh())]);
    }

    public function destroy(Company $company): JsonResponse
    {
        $company->delete();
        return response()->json(['message' => 'Company deleted successfully']);
    }

    public function list(): JsonResponse
    {
        $companies = Company::select(['id', 'company_name'])->orderBy('company_name')->get();
        return response()->json(['data' => $companies]);
    }
}
