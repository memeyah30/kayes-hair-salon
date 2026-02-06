<?php

namespace App\Http\Controllers;

use App\Models\PaymentAccount;
use Illuminate\Http\Request;

class PaymentAccountController extends Controller
{
    public function index(Request $request)
    {
        // For admin route /payment-accounts/all, return all accounts
        // For public route /payment-accounts, return only active accounts
        if ($request->user()) {
            return PaymentAccount::orderBy('is_active', 'desc')->orderBy('account_name')->get();
        }
        return PaymentAccount::where('is_active', true)->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:255',
            'account_type' => 'required|in:gcash,paymaya,bank,other',
            'bank_name' => 'nullable|string|max:255',
            'qr_code_url' => 'nullable|url',
            'is_active' => 'boolean',
            'instructions' => 'nullable|string',
        ]);

        $account = PaymentAccount::create($data);
        return response()->json($account, 201);
    }

    public function update(Request $request, PaymentAccount $paymentAccount)
    {
        $data = $request->validate([
            'account_name' => 'sometimes|string|max:255',
            'account_number' => 'sometimes|string|max:255',
            'account_type' => 'sometimes|in:gcash,paymaya,bank,other',
            'bank_name' => 'nullable|string|max:255',
            'qr_code_url' => 'nullable|url',
            'is_active' => 'boolean',
            'instructions' => 'nullable|string',
        ]);

        $paymentAccount->update($data);
        return response()->json($paymentAccount);
    }

    public function destroy(PaymentAccount $paymentAccount)
    {
        $paymentAccount->delete();
        return response()->json(['message' => 'Payment account deleted successfully']);
    }
}

