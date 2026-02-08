<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceVariantController;
use App\Http\Controllers\StylistController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\CustomerRatingController;
use App\Http\Controllers\PaymentAccountController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;

// Root route - serve frontend
Route::get('/', function () {
    return file_exists(public_path('index.html')) 
        ? file_get_contents(public_path('index.html'))
        : response()->json([
            'message' => 'THOLITS SALON API',
            'status' => 'running',
            'version' => '1.0.0',
            'note' => 'Frontend not found. Please build the frontend and copy to public directory.'
        ]);
});

// CSRF token route (for SPA)
Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
});

// Public routes
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/stylists', [StylistController::class, 'index']);
Route::get('/stylists/{stylist}/availability', [StylistController::class, 'availability']);
Route::post('/appointments', [AppointmentController::class, 'store']); // Public booking
Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']); // Public view (for receipt)
Route::get('/appointments/{appointment}/receipt', [AppointmentController::class, 'receipt']); // Public receipt
Route::get('/holidays/check', [HolidayController::class, 'checkDate']); // Check if date is holiday
Route::get('/payment-accounts', [PaymentAccountController::class, 'index']); // Public payment accounts
Route::get('/locations', [LocationController::class, 'index']); // Public locations

Route::post('/ratings', [CustomerRatingController::class, 'store']); // Public - customers can rate

// Auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth.any');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth.any');

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

    // Ratings management
    Route::get('/ratings', [CustomerRatingController::class, 'index']);
    Route::delete('/ratings/{customerRating}', [CustomerRatingController::class, 'destroy']);

    // Inventory management
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('/inventory/stats', [InventoryController::class, 'stats']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::patch('/inventory/{inventory}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy']);

    // Sales management
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/stats', [SaleController::class, 'stats']);
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

// Admin + Manager routes (shared management permissions)
Route::middleware(['auth.any', 'userType:admin,manager,stylist'])->group(function () {
    // Dashboard stats (admin + manager)
    Route::get('/dashboard/admin/stats', [DashboardController::class, 'adminStats']);
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/history', [AppointmentController::class, 'history']);
    Route::patch('/appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::post('/appointments/{appointment}/missed', [AppointmentController::class, 'markMissed']);
    Route::post('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);
    Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy']);

    // Holidays management (admin and manager)
    Route::get('/holidays', [HolidayController::class, 'index']);
    Route::post('/holidays', [HolidayController::class, 'store']);
    Route::patch('/holidays/{holiday}', [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // Ratings view
    Route::get('/ratings', [CustomerRatingController::class, 'index']);
});

// Stylist-only routes
Route::middleware(['auth.any', 'userType:stylist'])->group(function () {
    Route::get('/dashboard/stylist/stats', [DashboardController::class, 'stylistStats']);
    Route::get('/appointments/assigned', [AppointmentController::class, 'index']); // Only assigned appointments
    Route::get('/appointments/history', [AppointmentController::class, 'history']); // Appointment history
    Route::get('/appointments/rescheduled', [AppointmentController::class, 'index']); // Rescheduled appointments
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::get('/ratings', [CustomerRatingController::class, 'index']); // View own ratings
});

// Public customer stats (no auth required)
Route::get('/dashboard/customer/stats', [DashboardController::class, 'customerStats']);

// Catch-all route for React Router - must be last
Route::get('/{any}', function () {
    return file_exists(public_path('index.html')) 
        ? file_get_contents(public_path('index.html'))
        : response()->json(['message' => 'Not found'], 404);
})->where('any', '.*');
