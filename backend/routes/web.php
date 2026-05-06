<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceVariantController;
use App\Http\Controllers\StylistController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\CustomerRatingController;
use App\Http\Controllers\PaymentAccountController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PasswordSetupController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ServiceInventoryRequirementController;
use App\Http\Controllers\ManageBookingController;
use App\Http\Controllers\Manager\StaffController as ManagerStaffController;
use App\Http\Controllers\Admin\StaffApprovalController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

$serveFrontend = function () {
    return file_exists(public_path('index.html'))
        ? response(file_get_contents(public_path('index.html')), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ])
        : response()->json([
            'message' => 'Frontend not found',
        ], 404);
};

$serveUploadedAsset = function (string $relativePath, array $candidateRoots) {
    $normalizedPath = trim(str_replace('\\', '/', $relativePath), '/');

    if ($normalizedPath === '' || str_contains($normalizedPath, '..')) {
        abort(404);
    }

    foreach ($candidateRoots as $root) {
        $absolutePath = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalizedPath);
        if (is_file($absolutePath)) {
            return response()->file($absolutePath, [
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    abort(404);
};

// Root route - serve frontend
Route::get('/', $serveFrontend);

// CSRF token route (for SPA)
Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
});

Route::get('/uploads/{path}', function (string $path) use ($serveUploadedAsset) {
    return $serveUploadedAsset($path, [
        public_path('uploads'),
        storage_path('app/public/uploads'),
    ]);
})->where('path', '.*');

Route::get('/storage/{path}', function (string $path) use ($serveUploadedAsset) {
    return $serveUploadedAsset($path, [
        storage_path('app/public'),
        public_path(),
    ]);
})->where('path', '.*');

// Public routes
Route::get('/services', function (Request $request) use ($serveFrontend) {
    if ($request->expectsJson() || $request->wantsJson()) {
        return app(ServiceController::class)->index($request);
    }

    return $serveFrontend();
});
Route::get('/stylists', function (Request $request) use ($serveFrontend) {
    if ($request->expectsJson() || $request->wantsJson()) {
        return app(StylistController::class)->index($request);
    }

    return $serveFrontend();
});
Route::get('/public/ratings', function (Request $request) use ($serveFrontend) {
    if ($request->expectsJson() || $request->wantsJson()) {
        return app(CustomerRatingController::class)->publicIndex();
    }

    return $serveFrontend();
});

Route::get('/stylists/{stylist}/availability', [StylistController::class, 'availability']);
Route::get('/appointments/availability', [AppointmentController::class, 'availability']);
Route::post('/appointments', [AppointmentController::class, 'store']); // Public booking
Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']); // Public view (for receipt)
Route::get('/appointments/{appointment}/receipt', [AppointmentController::class, 'receipt']); // Public receipt
Route::get('/appointments/{appointment}/qr-code', [AppointmentController::class, 'qrCode']); // Public receipt QR
Route::get('/holidays/calendar', [HolidayController::class, 'calendar']); // Closed dates for booking calendar
Route::get('/holidays/check', [HolidayController::class, 'checkDate']); // Check if date is holiday
Route::get('/payment-accounts', [PaymentAccountController::class, 'index']); // Public payment accounts
Route::get('/locations', [LocationController::class, 'index']); // Public locations

Route::post('/ratings', [CustomerRatingController::class, 'store']); // Public - customers can rate

// Auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth.any');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth.any');
Route::post('/me/profile-photo', [AuthController::class, 'updateProfilePhoto'])->middleware(['auth.any', 'userType:manager,stylist']);
Route::delete('/me/profile-photo', [AuthController::class, 'removeProfilePhoto'])->middleware(['auth.any', 'userType:manager,stylist']);

// Manager staff request routes (web/session auth)
Route::middleware(['auth.any', 'userType:manager'])->group(function () {
    Route::get('/manager/staff', [ManagerStaffController::class, 'index']);
    Route::post('/manager/staff', [ManagerStaffController::class, 'store']);
});

// Admin staff approval routes (web/session auth)
Route::middleware(['auth.any', 'userType:admin'])->group(function () use ($serveFrontend) {
    Route::get('/admin/staff/pending', function (Request $request) use ($serveFrontend) {
        if ($request->expectsJson() || $request->wantsJson()) {
            return app(StaffApprovalController::class)->pendingIndex($request);
        }

        return $serveFrontend();
    });
    Route::patch('/admin/staff/{id}/approve', [StaffApprovalController::class, 'approve']);
    Route::patch('/admin/staff/{id}/reject', [StaffApprovalController::class, 'reject']);
});

// Protected SPA entry routes so direct URL access is blocked unless the session is authenticated.
Route::middleware(['auth.any', 'userType:admin,manager'])->group(function () use ($serveFrontend) {
    Route::get('/admin/dashboard', $serveFrontend);
    Route::get('/admin/appointments', $serveFrontend);
    Route::get('/admin/customers', $serveFrontend);
    Route::get('/admin/ratings', $serveFrontend);
    Route::get('/admin/holidays', $serveFrontend);
});

Route::middleware(['auth.any', 'userType:admin'])->group(function () use ($serveFrontend) {
    Route::get('/admin/manage/stylists', $serveFrontend);
    Route::get('/admin/manage/services', $serveFrontend);
    Route::get('/admin/payment-accounts', $serveFrontend);
    Route::get('/admin/sales', $serveFrontend);
});

Route::middleware(['auth.any', 'userType:manager'])->group(function () use ($serveFrontend) {
    Route::get('/manager/staff/add', $serveFrontend);
    Route::get('/manager/staff/requests', $serveFrontend);
});

// Admin-only routes
Route::middleware(['auth.any', 'userType:admin'])->group(function () {
    // Stylists (staff) management + time-offs
    Route::get('/stylists/{stylist}', [StylistController::class, 'show']);
    Route::post('/stylists', [StylistController::class, 'store']);
    Route::match(['patch', 'post'], '/stylists/{stylist}', [StylistController::class, 'update'])->where('stylist', '[0-9]+');
    Route::delete('/stylists/{stylist}', [StylistController::class, 'destroy']);
    Route::post('/stylists/{stylist}/time-offs', [StylistController::class, 'addTimeOff']);
    Route::delete('/stylists/{stylist}/time-offs/{timeOff}', [StylistController::class, 'removeTimeOff']);

    // Services management
    Route::post('/services', [ServiceController::class, 'store']);
    Route::match(['patch', 'post'], '/services/{service}', [ServiceController::class, 'update'])->where('service', '[0-9]+');
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
    
    // Service variants management
    Route::get('/services/{service}/variants', [ServiceVariantController::class, 'index']);
    Route::post('/services/{service}/variants', [ServiceVariantController::class, 'store']);
    Route::patch('/service-variants/{serviceVariant}', [ServiceVariantController::class, 'update']);
    Route::delete('/service-variants/{serviceVariant}', [ServiceVariantController::class, 'destroy']);

    // Holidays management
    Route::get('/holidays', [HolidayController::class, 'index']);
    Route::post('/holidays', [HolidayController::class, 'store']);
    Route::patch('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // Payment accounts management
    Route::get('/payment-accounts/all', [PaymentAccountController::class, 'index']);
    Route::post('/payment-accounts', [PaymentAccountController::class, 'store']);
    Route::patch('/payment-accounts/{paymentAccount}', [PaymentAccountController::class, 'update']);
    Route::delete('/payment-accounts/{paymentAccount}', [PaymentAccountController::class, 'destroy']);

    // Locations management
    Route::get('/locations/all', [LocationController::class, 'index']);
    Route::post('/locations', [LocationController::class, 'store']);
    Route::patch('/locations/{location}', [LocationController::class, 'update']);
    Route::delete('/locations/{location}', [LocationController::class, 'destroy']);

    // Ratings management (delete remains admin-only)
    Route::delete('/ratings/{customerRating}', [CustomerRatingController::class, 'destroy']);

    // Inventory management
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('/inventory/stats', [InventoryController::class, 'stats']);
    Route::get('/inventory/usage-logs', [InventoryController::class, 'usageLogs']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::patch('/inventory/{inventory}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy']);

    // Service-to-product usage mapping
    Route::get('/services/{service}/inventory-requirements', [ServiceInventoryRequirementController::class, 'index']);
    Route::put('/services/{service}/inventory-requirements', [ServiceInventoryRequirementController::class, 'sync']);

    // Sales management
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/stats', [SaleController::class, 'stats']);
    Route::get('/sales/export-pdf', [SaleController::class, 'exportPdf']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::patch('/sales/{sale}', [SaleController::class, 'update']);
    Route::delete('/sales/{sale}', [SaleController::class, 'destroy']);

    // Managers management
    Route::get('/managers', [\App\Http\Controllers\ManagerController::class, 'index']);
    Route::post('/managers', [\App\Http\Controllers\ManagerController::class, 'store']);
    Route::match(['patch', 'post'], '/managers/{manager}', [\App\Http\Controllers\ManagerController::class, 'update'])->where('manager', '[0-9]+');
    Route::delete('/managers/{manager}', [\App\Http\Controllers\ManagerController::class, 'destroy']);
});

// Admin + Manager dashboard stats
Route::middleware(['auth.any', 'userType:admin,manager'])->group(function () {
    Route::get('/dashboard/admin/stats', [DashboardController::class, 'adminStats']);
    Route::get('/ratings', [CustomerRatingController::class, 'index']);
    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/admin/notifications', [NotificationController::class, 'index']);
    Route::patch('/admin/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
});

// Shared management routes
Route::middleware(['auth.any', 'userType:admin,manager,stylist'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/history', [AppointmentController::class, 'history']);
    Route::patch('/appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::post('/appointments/{appointment}/missed', [AppointmentController::class, 'markMissed']);
    Route::post('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::post('/appointments-reject/{appointment}', [AppointmentController::class, 'reject']);
    Route::match(['post', 'patch'], '/appointments/{appointment}/reject', [AppointmentController::class, 'reject']);
    Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy']);

    // Holidays management (admin and manager)
    Route::get('/holidays', [HolidayController::class, 'index']);
    Route::post('/holidays', [HolidayController::class, 'store']);
    Route::patch('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

});

// Stylist-only routes
Route::middleware(['auth.any', 'userType:stylist'])->group(function () {
    Route::get('/dashboard/stylist/stats', [DashboardController::class, 'stylistStats']);
    Route::get('/appointments/assigned', [AppointmentController::class, 'index']); // Only assigned appointments
    Route::get('/appointments/history', [AppointmentController::class, 'history']); // Appointment history
    Route::get('/appointments/rescheduled', [AppointmentController::class, 'index']); // Rescheduled appointments
    Route::get('/stylist/ratings', [CustomerRatingController::class, 'index']); // View own ratings
});

// Verified customer stats
Route::get('/dashboard/customer/stats', [DashboardController::class, 'customerStats'])->middleware('customer.otp');

// Customer manage-booking SPA route requires an OTP-verified session.
Route::get('/customer/manage', $serveFrontend)->middleware('customer.otp.web');

// Public magic-link entry to manage booking dashboard
Route::get('/a/{token}', [ManageBookingController::class, 'magicLink'])->name('customer.magic');
// Public password setup routes for approved staff
Route::get('/setup-password/{token}', [PasswordSetupController::class, 'show'])->name('password.setup.show');
Route::post('/setup-password', [PasswordSetupController::class, 'store'])->name('password.setup.store');

// Compatibility redirects for older frontend bundles / bookmarks
Route::get('/customer/dashboard', function (Request $request) {
    $query = $request->getQueryString();
    return redirect('/customer' . ($query ? ('?' . $query) : ''));
});
Route::get('/manage-booking/dashboard', function (Request $request) {
    $query = $request->getQueryString();
    return redirect('/customer' . ($query ? ('?' . $query) : ''));
});

Route::view('/privacy-policy', 'privacy-policy');

// Catch-all route for React Router - must be last
Route::get('/{any}', $serveFrontend)->where('any', '^(?!storage/|assets/).*$');
