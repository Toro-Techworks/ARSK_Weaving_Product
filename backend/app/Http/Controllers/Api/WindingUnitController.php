<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WindingUnitResource;
use App\Models\GenericCode;
use App\Models\WindingUnit;
use App\Support\Gstin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WindingUnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $units = WindingUnit::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->where('status', 'Active'))
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%"))
            ->orderBy('company_name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $units,
            WindingUnitResource::collection($units->items())->resolve()
        );
    }

    public function deletedIndex(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $units = WindingUnit::onlyTrashed()
            ->when($request->search, fn ($q) => $q->where('company_name', 'like', "%{$request->search}%")
                ->orWhere('gst_number', 'like', "%{$request->search}%"))
            ->orderByDesc('deleted_at')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $units,
            WindingUnitResource::collection($units->items())->resolve()
        );
    }

    public function restoreTrashed(int $id): JsonResponse
    {
        $unit = WindingUnit::onlyTrashed()->findOrFail($id);
        $unit->restore();

        return response()->json([
            'message' => 'Winding unit restored.',
            'data' => new WindingUnitResource($unit->fresh()),
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
            'status' => GenericCode::validationRule('active_inactive'),
        ]);
        $validated['gst_number'] = Gstin::normalize($validated['gst_number']);

        $validated['status'] = $validated['status'] ?? 'Active';

        $unit = WindingUnit::create($validated);

        return response()->json(['data' => new WindingUnitResource($unit)], 201);
    }

    public function show(WindingUnit $windingUnit): JsonResponse
    {
        return response()->json(['data' => new WindingUnitResource($windingUnit)]);
    }

    public function update(Request $request, WindingUnit $windingUnit): JsonResponse
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
            'phone' => 'nullable|string|max:20',
            'payment_terms' => 'nullable|string|max:255',
            'status' => GenericCode::validationRule('active_inactive'),
        ]);
        if (array_key_exists('gst_number', $validated)) {
            $validated['gst_number'] = Gstin::normalize($validated['gst_number']);
        }

        $windingUnit->update($validated);

        return response()->json(['data' => new WindingUnitResource($windingUnit->fresh())]);
    }

    public function destroy(WindingUnit $windingUnit): JsonResponse
    {
        $windingUnit->delete();

        return response()->json(['message' => 'Winding unit deleted successfully']);
    }
}
