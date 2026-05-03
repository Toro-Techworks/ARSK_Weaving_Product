<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Support\Gstin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    private static function normalizeEmail(?string $email): ?string
    {
        if ($email === null || $email === '') {
            return null;
        }

        return strtolower(trim($email));
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $companies = Company::query()
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%"))
            ->orderBy('company_name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $companies,
            CompanyResource::collection($companies->items())->resolve()
        );
    }

    public function deletedIndex(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $companies = Company::onlyTrashed()
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%"))
            ->orderByDesc('deleted_at')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $companies,
            CompanyResource::collection($companies->items())->resolve()
        );
    }

    public function permanentDeleteTrashed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => [
                'integer',
                Rule::exists('companies', 'id')->whereNotNull('deleted_at'),
            ],
        ]);

        $ids = $validated['ids'];
        $companies = Company::onlyTrashed()->whereIn('id', $ids)->get();
        foreach ($companies as $company) {
            $company->forceDelete();
        }

        return response()->json([
            'message' => 'Selected companies were permanently deleted.',
            'deleted_count' => $companies->count(),
        ]);
    }

    public function restoreTrashed(int $id): JsonResponse
    {
        $company = Company::onlyTrashed()->findOrFail($id);
        $company->restore();

        return response()->json([
            'message' => 'Company restored.',
            'data' => new CompanyResource($company->fresh()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'gst_number' => [
                'required',
                'string',
                'max:15',
                fn (string $attribute, mixed $value, \Closure $fail) => Gstin::isValid($value) || $fail('Invalid GSTIN format.'),
            ],
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);
        $validated['gst_number'] = Gstin::normalize($validated['gst_number']);

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
            'gst_number' => [
                'sometimes',
                'required',
                'string',
                'max:15',
                fn (string $attribute, mixed $value, \Closure $fail) => Gstin::isValid($value) || $fail('Invalid GSTIN format.'),
            ],
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|string|email|max:255',
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
        ]);
        if (array_key_exists('gst_number', $validated)) {
            $validated['gst_number'] = Gstin::normalize($validated['gst_number']);
        }
        if (array_key_exists('email', $validated)) {
            $validated['email'] = self::normalizeEmail($validated['email']);
        }

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
