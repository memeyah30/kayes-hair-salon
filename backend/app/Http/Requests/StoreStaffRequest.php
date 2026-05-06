<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $specializationIds = $this->input('specialization_ids');
        if (is_string($specializationIds) && $specializationIds !== '') {
            $decoded = json_decode($specializationIds, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->merge(['specialization_ids' => $decoded]);
            } else {
                $values = collect(explode(',', $specializationIds))
                    ->map(fn ($item) => (int) trim((string) $item))
                    ->filter(fn ($item) => $item > 0)
                    ->values()
                    ->all();
                $this->merge(['specialization_ids' => $values]);
            }
        }

        $specialization = $this->input('specialization');

        if (is_string($specialization) && $specialization !== '') {
            $decoded = json_decode($specialization, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->merge(['specialization' => $decoded]);
            } else {
                $values = collect(explode(',', $specialization))
                    ->map(fn ($item) => trim((string) $item))
                    ->filter()
                    ->values()
                    ->all();
                $this->merge(['specialization' => $values]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', Rule::in(['manager'])],
            'specialization_ids' => ['nullable', 'array'],
            'specialization_ids.*' => ['integer', 'exists:services,id'],
            'specialization' => ['nullable', 'array'],
            'specialization.*' => ['string', 'max:100'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
