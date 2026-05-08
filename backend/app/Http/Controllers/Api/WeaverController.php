<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WeaverResource;
use App\Models\GenericCode;
use App\Models\Weaver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class WeaverController extends Controller
{
    public function nextEmployeeCode(): JsonResponse
    {
        return response()->json([
            'data' => [
                'employee_code' => Weaver::nextSuggestedEmployeeCode(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $weavers = Weaver::query()
            ->when($request->search, function ($q) use ($request) {
                $term = $request->search;
                $q->where('weaver_name', 'like', "%{$term}%")
                    ->orWhere('employee_code', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('account_number', 'like', "%{$term}%")
                    ->orWhere('aadhar_number', 'like', "%{$term}%")
                    ->orWhere('pan_number', 'like', "%{$term}%");
            })
            ->orderBy('weaver_name')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $weavers,
            WeaverResource::collection($weavers->items())->resolve()
        );
    }

    public function deletedIndex(Request $request): JsonResponse
    {
        $perPage = $this->clampPerPage($request, 10, 100);
        $weavers = Weaver::onlyTrashed()
            ->when($request->search, function ($q) use ($request) {
                $term = $request->search;
                $q->where('weaver_name', 'like', "%{$term}%")
                    ->orWhere('employee_code', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('account_number', 'like', "%{$term}%")
                    ->orWhere('aadhar_number', 'like', "%{$term}%")
                    ->orWhere('pan_number', 'like', "%{$term}%");
            })
            ->orderByDesc('deleted_at')
            ->paginate($perPage);

        return $this->paginatedResponse(
            $weavers,
            WeaverResource::collection($weavers->items())->resolve()
        );
    }

    public function restoreTrashed(int $id): JsonResponse
    {
        $weaver = Weaver::onlyTrashed()->findOrFail($id);
        $weaver->restore();

        return response()->json([
            'message' => 'Weaver restored.',
            'data' => new WeaverResource($weaver->fresh()),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateWeaver($request, null);
        $data = $this->onlyPersistedAttributes($validated);
        $weaver = Weaver::create($data);
        $this->storeUploadedDocuments($request, $weaver);

        return response()->json(['data' => new WeaverResource($weaver->fresh())], 201);
    }

    public function show(Weaver $weaver): JsonResponse
    {
        return response()->json(['data' => new WeaverResource($weaver)]);
    }

    public function update(Request $request, Weaver $weaver): JsonResponse
    {
        $validated = $this->validateWeaver($request, $weaver);
        $data = $this->onlyPersistedAttributes($validated);
        $weaver->update($data);
        $this->storeUploadedDocuments($request, $weaver);

        return response()->json(['data' => new WeaverResource($weaver->fresh())]);
    }

    public function destroy(Weaver $weaver): JsonResponse
    {
        $weaver->delete();

        return response()->json(['message' => 'Weaver deleted successfully']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateWeaver(Request $request, ?Weaver $weaver): array
    {
        $uniqueRule = $weaver
            ? Rule::unique('weavers', 'employee_code')->ignore($weaver->id)->whereNull('deleted_at')
            : Rule::unique('weavers', 'employee_code')->whereNull('deleted_at');

        $employeeRules = $weaver
            ? ['sometimes', 'required', 'string', 'max:50', $uniqueRule]
            : ['required', 'string', 'max:50', $uniqueRule];

        return $request->validate([
            'employee_code' => $employeeRules,
            'weaver_name' => $weaver ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'joining_date' => 'nullable|date',
            'status' => GenericCode::validationRule('active_inactive'),
            'account_number' => 'nullable|string|max:64',
            'aadhar_number' => 'nullable|string|max:20',
            'pan_number' => 'nullable|string|max:20',
            'aadhar_document' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120',
            'pan_document' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function onlyPersistedAttributes(array $validated): array
    {
        return collect($validated)
            ->only([
                'employee_code',
                'weaver_name',
                'phone',
                'address',
                'joining_date',
                'status',
                'account_number',
                'aadhar_number',
                'pan_number',
            ])
            ->all();
    }

    private function storeUploadedDocuments(Request $request, Weaver $weaver): void
    {
        $disk = Storage::disk('public');
        $dirty = false;

        if ($request->hasFile('aadhar_document')) {
            if ($weaver->aadhar_document_path) {
                $disk->delete($weaver->aadhar_document_path);
            }
            $weaver->aadhar_document_path = $request->file('aadhar_document')->store("weavers/{$weaver->id}", 'public');
            $dirty = true;
        }

        if ($request->hasFile('pan_document')) {
            if ($weaver->pan_document_path) {
                $disk->delete($weaver->pan_document_path);
            }
            $weaver->pan_document_path = $request->file('pan_document')->store("weavers/{$weaver->id}", 'public');
            $dirty = true;
        }

        if ($dirty) {
            $weaver->save();
        }
    }
}
