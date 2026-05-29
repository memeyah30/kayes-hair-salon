<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all settings grouped by their group.
     */
    public function index()
    {
        $settings = Setting::all();
        
        $grouped = $settings->groupBy('group')->map(function ($items) {
            return $items->keyBy('key')->map(function ($item) {
                return $this->castValue($item->value, $item->type);
            });
        });

        return response()->json($grouped);
    }

    /**
     * Get public settings (General info only) for the landing page.
     */
    public function publicIndex()
    {
        // Only return non-sensitive groups needed by the public booking flow.
        $publicGroups = ['general', 'appointment', 'payment'];
        
        $settings = Setting::whereIn('group', $publicGroups)->get();
        
        $grouped = $settings->groupBy('group')->map(function ($items) {
            return $items->keyBy('key')->map(function ($item) {
                return $this->castValue($item->value, $item->type);
            });
        });

        return response()->json($grouped);
    }

    /**
     * Update multiple settings at once.
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|exists:settings,key',
            'settings.*.value' => 'nullable',
        ]);

        foreach ($data['settings'] as $item) {
            $setting = Setting::where('key', $item['key'])->first();
            if ($setting) {
                $value = $item['value'];
                
                // If the setting type is json/array, encode it
                if (in_array($setting->type, ['json', 'array']) && is_array($value)) {
                    $value = json_encode($value);
                }
                
                $setting->update(['value' => $value]);
            }
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    /**
     * Cast the value based on the defined type.
     */
    private function castValue($value, string $type)
    {
        if ($value === null) return null;

        switch ($type) {
            case 'integer':
            case 'int':
                return (int) $value;
            case 'boolean':
            case 'bool':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'json':
            case 'array':
                return json_decode($value, true);
            case 'float':
            case 'double':
                return (float) $value;
            default:
                return $value;
        }
    }
}
