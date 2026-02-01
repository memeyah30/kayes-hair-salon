<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Carbon\Carbon;

class HolidayController extends Controller
{
    public function index()
    {
        return Holiday::orderBy('date')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'required|in:holiday,occasion,closed',
            'is_closed' => 'boolean',
            'description' => 'nullable|string',
            'recurring_yearly' => 'boolean',
        ]);

        $holiday = Holiday::create($data);
        return response()->json($holiday, 201);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'type' => 'sometimes|in:holiday,occasion,closed',
            'is_closed' => 'boolean',
            'description' => 'nullable|string',
            'recurring_yearly' => 'boolean',
        ]);

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
}

