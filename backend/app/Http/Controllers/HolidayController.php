<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class HolidayController extends Controller
{
    public function index()
    {
        return Holiday::orderBy('date')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->holidayValidationRules(false));
        $data = $this->filterMissingColumns($data);

        $holiday = Holiday::create($data);
        return response()->json($holiday, 201);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $data = $request->validate($this->holidayValidationRules(true));
        $data = $this->filterMissingColumns($data);

        $holiday->update($data);
        return response()->json($holiday);
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();
        return response()->json(['message' => 'Holiday deleted successfully']);
    }

    public function checkDate(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $date = Carbon::parse($request->date)->format('Y-m-d');
        $holiday = Holiday::where('date', $date)->first();

        if ($holiday && $holiday->is_closed) {
            return response()->json([
                'is_holiday' => true,
                'holiday' => $holiday,
                'message' => "The salon is closed on {$holiday->name}. Please choose another date.",
            ]);
        }

        return response()->json([
            'is_holiday' => false,
        ]);
    }

    private function holidayValidationRules(bool $isUpdate): array
    {
        $rules = [
            'name' => ($isUpdate ? 'sometimes' : 'required') . '|string|max:255',
            'date' => ($isUpdate ? 'sometimes' : 'required') . '|date',
            'is_closed' => 'boolean',
            'description' => 'nullable|string',
        ];

        if (Schema::hasColumn('holidays', 'type')) {
            $rules['type'] = ($isUpdate ? 'sometimes' : 'required') . '|in:holiday,occasion,closed';
        }

        if (Schema::hasColumn('holidays', 'recurring_yearly')) {
            $rules['recurring_yearly'] = 'boolean';
        }

        return $rules;
    }

    private function filterMissingColumns(array $data): array
    {
        if (!Schema::hasColumn('holidays', 'type')) {
            unset($data['type']);
        }

        if (!Schema::hasColumn('holidays', 'recurring_yearly')) {
            unset($data['recurring_yearly']);
        }

        return $data;
    }
}

