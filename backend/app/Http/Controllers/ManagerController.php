<?php

namespace App\Http\Controllers;

use App\Models\Manager;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
            'email' => 'required|string|email|unique:managers,email',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string|max:500',
            'username' => 'nullable|string|unique:managers,username',
            'password' => 'required|string|min:6',
            'active' => 'nullable',
        ]);

        $data['active'] = $this->normalizeActive($data['active'] ?? true);
        
        // If username is not provided, use the email prefix
        if (empty($data['username'])) {
            $data['username'] = explode('@', $data['email'])[0];
            // Ensure unique username
            $baseUsername = $data['username'];
            $counter = 1;
            while (\App\Models\Manager::where('username', $data['username'])->exists()) {
                $data['username'] = $baseUsername . $counter;
                $counter++;
            }
        }

        $manager = Manager::create($data);

        return response()->json($manager, 201);
    }

    public function update(Request $request, Manager $manager)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|string|email|unique:managers,email,' . $manager->id,
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string|max:500',
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

    public function resetPassword(Manager $manager)
    {
        $tempPassword = Str::random(10);
        $manager->password = $tempPassword;
        $manager->save();

        return response()->json([
            'message' => 'Password reset successfully',
            'temporary_password' => $tempPassword
        ]);
    }

    private function normalizeActive($value): bool
    {
        if (is_string($value)) {
            return $value === 'true' || $value === '1' || $value === 'on';
        }

        return (bool) $value;
    }
}

