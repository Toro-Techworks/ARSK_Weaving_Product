<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\YarnOrder;
use App\Models\YarnRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YarnRequirementController extends Controller
{
    public function indexByYarnOrder(string $yarnOrderId): JsonResponse
    {
        if (! YarnOrder::where('id', $yarnOrderId)->exists()) {
            return response()->json(['message' => 'Yarn order not found.'], 404);
        }
        $items = YarnRequirement::where('yarn_order_id', $yarnOrderId)->orderBy('id')->get();
        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'yarn_requirement' => 'nullable|string|max:255',
            'colour' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:255',
            'required_weight' => 'nullable|numeric',
        ]);
        $item = YarnRequirement::create($validated);
        return response()->json(['data' => $item], 201);
    }

    public function update(Request $request, YarnRequirement $yarnRequirement): JsonResponse
    {
        $validated = $request->validate([
            'yarn_requirement' => 'nullable|string|max:255',
            'colour' => 'nullable|string|max:128',
            'count' => 'nullable|string|max:64',
            'content' => 'nullable|string|max:255',
            'required_weight' => 'nullable|numeric',
        ]);
        $yarnRequirement->update($validated);
        return response()->json(['data' => $yarnRequirement->fresh()]);
    }

    public function destroy(YarnRequirement $yarnRequirement): JsonResponse
    {
        $yarnRequirement->delete();
        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Replace all yarn requirements for a yarn order (bulk sync).
     * POST /yarn-requirements/bulk
     * Body: { yarn_order_id: int, yarn_requirements: [{ yarn_requirement, colour, count, content, required_weight }, ...] }
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'yarn_order_id' => 'required|exists:yarn_orders,id',
            'yarn_requirements' => 'required|array',
            'yarn_requirements.*.yarn_requirement' => 'nullable|string|max:255',
            'yarn_requirements.*.colour' => 'nullable|string|max:128',
            'yarn_requirements.*.count' => 'nullable|string|max:64',
            'yarn_requirements.*.content' => 'nullable|string|max:255',
            'yarn_requirements.*.required_weight' => 'nullable|numeric',
        ]);

        $yarnOrderId = (int) $validated['yarn_order_id'];
        YarnRequirement::where('yarn_order_id', $yarnOrderId)->delete();

        $created = [];
        foreach ($validated['yarn_requirements'] as $row) {
            $item = YarnRequirement::create([
                'yarn_order_id' => $yarnOrderId,
                'yarn_requirement' => $row['yarn_requirement'] ?? null,
                'colour' => $row['colour'] ?? null,
                'count' => $row['count'] ?? null,
                'content' => $row['content'] ?? null,
                'required_weight' => isset($row['required_weight']) ? (float) $row['required_weight'] : null,
            ]);
            $created[] = $item;
        }

        return response()->json(['data' => $created, 'message' => count($created) . ' requirement(s) saved'], 201);
    }
}
