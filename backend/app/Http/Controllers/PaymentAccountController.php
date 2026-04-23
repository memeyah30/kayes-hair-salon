<?php

namespace App\Http\Controllers;

use App\Models\PaymentAccount;
use App\Support\UploadStorage;
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
            'qr_code_file' => 'nullable|image|max:2048',
            'is_active' => 'boolean',
            'instructions' => 'nullable|string',
        ]);

        $this->handleQrUpload($request, $data);

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
            'qr_code_file' => 'nullable|image|max:2048',
            'is_active' => 'boolean',
            'instructions' => 'nullable|string',
        ]);

        $this->handleQrUpload($request, $data, $paymentAccount);

        $paymentAccount->update($data);
        return response()->json($paymentAccount);
    }

    public function destroy(PaymentAccount $paymentAccount)
    {
        if ($paymentAccount->qr_code_path) {
            UploadStorage::delete($paymentAccount->getRawOriginal('qr_code_path'));
        }
        $paymentAccount->delete();
        return response()->json(['message' => 'Payment account deleted successfully']);
    }

    /**
     * Handles optional QR code file upload and normalizes URLs.
     *
     * If a file is uploaded, it becomes the source of truth (stored in public disk),
     * and any previous stored file is removed. If a URL is provided, it clears
     * any stored file reference.
     */
    private function handleQrUpload(Request $request, array &$data, ?PaymentAccount $existing = null): void
    {
        // If a new QR file is uploaded, store it and delete the old one
        if ($request->hasFile('qr_code_file')) {
            $path = UploadStorage::store($request->file('qr_code_file'), 'payment-accounts');
            $data['qr_code_path'] = $path;
            $data['qr_code_url'] = UploadStorage::url($path);

            if ($existing && $existing->qr_code_path) {
                UploadStorage::delete($existing->getRawOriginal('qr_code_path'));
            }
            return;
        }

        // If URL explicitly provided (including empty), sync path accordingly
        if ($request->has('qr_code_url')) {
            $url = $request->input('qr_code_url');
            if ($url) {
                // User-supplied URL replaces stored file
                if ($existing && $existing->qr_code_path) {
                    UploadStorage::delete($existing->getRawOriginal('qr_code_path'));
                }
                $data['qr_code_path'] = null;
                $data['qr_code_url'] = $url;
            } else {
                // Clear QR entirely
                if ($existing && $existing->qr_code_path) {
                    UploadStorage::delete($existing->getRawOriginal('qr_code_path'));
                }
                $data['qr_code_path'] = null;
                $data['qr_code_url'] = null;
            }
        }
    }
}
