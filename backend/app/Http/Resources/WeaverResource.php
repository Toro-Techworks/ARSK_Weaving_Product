<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class WeaverResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'weaver_name' => $this->weaver_name,
            'phone' => $this->phone,
            'address' => $this->address,
            'joining_date' => $this->joining_date,
            'status' => $this->status,
            'account_number' => $this->account_number,
            'aadhar_number' => $this->aadhar_number,
            'pan_number' => $this->pan_number,
            'aadhar_document_url' => $this->aadhar_document_path
                ? Storage::disk('public')->url($this->aadhar_document_path)
                : null,
            'pan_document_url' => $this->pan_document_path
                ? Storage::disk('public')->url($this->pan_document_path)
                : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
        ];
    }
}
