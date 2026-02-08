<?php

namespace App\Http\Controllers;

use App\Models\Manager;
use Illuminate\Http\Request;

class ManagerController extends Controller
{
    public function index()
    {
        return Manager::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'username' => 'required|string|unique:managers,username',
            'password' => 'required|string|min:6',
            'active' => 'nullable',
        ]);

        $data['active'] = $this->normalizeActive($data['active'] ?? true);

        $manager = Manager::create($data);

        return response()->json($manager, 201);
    }

    public function update(Request $request, Manager $manager)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'username' => 'sometimes|string|unique:managers,username,' . $manager->id,
            'password' => 'sometimes|nullable|string|min:6',
            'active' => 'sometimes|nullable',
        ]);

        if (array_key_exists('active', $data)) {
            $data['active'] = $this->normalizeActive($data['active']);
        }

        if (array_key_exists('password', $data) && empty($data['password'])) {
            unset($data['password']);
        }

        $manager->update($data);

        return $manager->fresh();
    }

    public function destroy(Manager $manager)
    {
        $manager->delete();

        return response()->json(['message' => 'Manager deleted']);
    }

    private function normalizeActive($value): bool
    {
        if (is_string($value)) {
            return $value === 'true' || $value === '1' || $value === 'on';
        }

        return (bool) $value;
    }
}

