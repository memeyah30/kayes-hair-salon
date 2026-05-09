<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceVariantController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\CustomerRatingController;
use App\Http\Controllers\PaymentAccountController;
use App\Http\Controllers\LocationController;

use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SaleController;

use App\Http\Controllers\ManageBookingController;
use App\Http\Controllers\ReturningBookingController;
use App\Http\Controllers\Manager\StaffController as ManagerStaffController;
use App\Http\Controllers\Admin\StaffApprovalController;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

Route::middleware(StartSession::class)->group(function () {
    Route::get('/test', function () {
        return response()->json([
            'status' => 'success',
            'message' => 'Laravel API is working'
        ]);
    });

    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'message' => 'Laravel API is running'
        ]);
    });

    Route::get('/csrf-token', function () {
        return response()->json(['csrf_token' => csrf_token()]);
    });

    // Public routes
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/stylists', function () {
        return response()->json([]);
    });
    Route::get('/stylists/by-services', function () {
        return response()->json([]);
    });
    Route::get('/appointments/availability', [AppointmentController::class, 'availability']);
    Route::post('/appointments', [AppointmentController::class, 'store']); // Public booking
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']); // Public view (for receipt)
    Route::get('/appointments/{appointment}/receipt', [AppointmentController::class, 'receipt']); // Public receipt
    Route::get('/holidays/calendar', [HolidayController::class, 'calendar']); // Calendar closed dates
    Route::get('/holidays/check', [HolidayController::class, 'checkDate']); // Check if date is holiday
    Route::get('/payment-accounts', [PaymentAccountController::class, 'index']); // Public payment accounts
    Route::get('/locations', [LocationController::class, 'index']); // Public locations

    Route::post('/ratings', [CustomerRatingController::class, 'store']); // Public - customers can rate
    Route::get('/public/ratings', [CustomerRatingController::class, 'publicIndex']); // Public - reviews for homepage
    Route::get('/public/settings', [\App\Http\Controllers\SettingController::class, 'publicIndex']); // Public - settings for homepage

    // Customer manage-booking OTP routes
    Route::post('/manage-booking/send-otp', [ManageBookingController::class, 'sendOtp']);
    Route::post('/manage-booking/verify-otp', [ManageBookingController::class, 'verifyOtp']);
    Route::post('/manage-booking/logout', [ManageBookingController::class, 'logout']);

    // Email-first returning-customer booking routes.
    Route::post('/returning-booking/check-email', [ReturningBookingController::class, 'checkEmail']);
    Route::post('/returning-booking/send-otp', [ReturningBookingController::class, 'sendOtp']);
    Route::post('/returning-booking/verify-otp', [ReturningBookingController::class, 'verifyOtp']);

    Route::middleware('customer.booking')->group(function () {
        Route::get('/returning-booking/profile', [ReturningBookingController::class, 'profile']);
        Route::patch('/returning-booking/profile', [ReturningBookingController::class, 'updateProfile']);
    });

    Route::middleware('customer.otp')->group(function () {
        Route::get('/manage-booking/appointments', [ManageBookingController::class, 'appointments']);
        Route::post('/manage-booking/appointments/{id}/reschedule', [ManageBookingController::class, 'reschedule']);
        Route::post('/manage-booking/appointments/{id}/cancel', [ManageBookingController::class, 'cancel']);
        Route::post('/manage-booking/appointments/{id}/rate', [ManageBookingController::class, 'rate']);
    });
    // Password recovery routes
    Route::post('/forgot-password', [\App\Http\Controllers\PasswordResetController::class, 'sendResetLinkEmail']);
    Route::post('/reset-password', [\App\Http\Controllers\PasswordResetController::class, 'reset']);

// Auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth.any');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth.any');
Route::post('/me/profile-photo', [AuthController::class, 'updateProfilePhoto'])->middleware(['auth.any', 'userType:manager']);
Route::delete('/me/profile-photo', [AuthController::class, 'removeProfilePhoto'])->middleware(['auth.any', 'userType:manager']);

// Manager staff request routes
Route::middleware(['auth.any', 'userType:manager'])->group(function () {
    Route::get('/manager/staff', [ManagerStaffController::class, 'index']);
    Route::post('/manager/staff', [ManagerStaffController::class, 'store']);
});

// Admin staff approval routes
Route::middleware(['auth.any', 'userType:admin'])->group(function () {
    Route::get('/admin/staff/pending', [StaffApprovalController::class, 'pendingIndex']);
    Route::patch('/admin/staff/{id}/approve', [StaffApprovalController::class, 'approve']);
    Route::patch('/admin/staff/{id}/reject', [StaffApprovalController::class, 'reject']);
});

// Admin-only routes
Route::middleware(['auth.any', 'userType:admin'])->group(function () {
    // Managers management
    Route::get('/managers', [ManagerController::class, 'index']);
    Route::post('/managers', [ManagerController::class, 'store']);
    Route::match(['patch', 'post'], '/managers/{manager}', [ManagerController::class, 'update'])->where('manager', '[0-9]+');
    Route::post('/managers/{manager}/reset-password', [ManagerController::class, 'resetPassword'])->where('manager', '[0-9]+');
    Route::delete('/managers/{manager}', [ManagerController::class, 'destroy']);

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

    // Sales management
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/stats', [SaleController::class, 'stats']);
    Route::get('/sales/export-pdf', [SaleController::class, 'exportPdf']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);
    Route::patch('/sales/{sale}', [SaleController::class, 'update']);
    Route::delete('/sales/{sale}', [SaleController::class, 'destroy']);

    // Settings management
    Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update']);
});

// Admin + Manager dashboard stats
Route::middleware(['auth.any', 'userType:admin,manager'])->group(function () {
    Route::get('/dashboard/admin/stats', [DashboardController::class, 'adminStats']);
    Route::get('/ratings', [CustomerRatingController::class, 'index']);
    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/admin/notifications', [NotificationController::class, 'index']);
    Route::patch('/admin/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
});

// Admin + Manager routes (shared management permissions)
Route::middleware(['auth.any', 'userType:admin,manager'])->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/history', [AppointmentController::class, 'history']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::post('/appointments/{appointment}/missed', [AppointmentController::class, 'markMissed']);
    Route::post('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::post('/appointments-reject/{appointment}', [AppointmentController::class, 'reject']);
    Route::match(['post', 'patch'], '/appointments/{appointment}/reject', [AppointmentController::class, 'reject']);
    Route::patch('/appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy']);

    // Holidays management (admin and manager)
    Route::get('/holidays', [HolidayController::class, 'index']);
    Route::post('/holidays', [HolidayController::class, 'store']);
    Route::patch('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

});

// Verified customer stats
Route::get('/dashboard/customer/stats', [DashboardController::class, 'customerStats'])->middleware('customer.otp');

Route::get('/debug-proofs', function () { return response()->json(['storage_path' => storage_path('app/public/payment-proofs'), 'exists' => is_dir(storage_path('app/public/payment-proofs')), 'files' => is_dir(storage_path('app/public/payment-proofs')) ? scandir(storage_path('app/public/payment-proofs')) : [], 'public_storage_symlink_exists' => is_link(public_path('storage')), 'public_storage_target' => is_link(public_path('storage')) ? readlink(public_path('storage')) : null]); });

Route::get('/debug-appt', function () { return response()->json(App\Models\Appointment::orderBy('id', 'desc')->first()); });
});

// Temporary Migration Route for Railway (Delete after use)
Route::get('/admin/run-migrations', function() {
    try {
        Artisan::call('migrate', ['--force' => true]);
        Artisan::call('db:seed', ['--class' => 'SettingSeeder', '--force' => true]);
        return response()->json([
            'message' => 'Migrations and Seeding successful!',
            'output' => Artisan::output()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});
