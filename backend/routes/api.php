<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\StylistController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/stylists', [StylistController::class, 'index']);
Route::get('/stylists/{stylist}/availability', [StylistController::class, 'availability']);
Route::post('/appointments', [AppointmentController::class, 'store']); // Public booking
Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']); // Public view (for receipt)
Route::get('/appointments/{appointment}/receipt', [AppointmentController::class, 'receipt']); // Public receipt

// Auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');

// Protected admin routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/stylists/{stylist}', [StylistController::class, 'show']);
    Route::post('/stylists', [StylistController::class, 'store']);
    Route::patch('/stylists/{stylist}', [StylistController::class, 'update']);
    Route::post('/stylists/{stylist}/time-offs', [StylistController::class, 'addTimeOff']);
    Route::delete('/stylists/{stylist}/time-offs/{timeOff}', [StylistController::class, 'removeTimeOff']);

    Route::post('/services', [ServiceController::class, 'store']);
    Route::patch('/services/{service}', [ServiceController::class, 'update']);

    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::patch('/appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'complete']);
    Route::post('/appointments/{appointment}/confirm', [AppointmentController::class, 'confirm']);

    // Dashboard stats
    Route::get('/dashboard/admin/stats', [DashboardController::class, 'adminStats']);
    Route::get('/dashboard/stylist/stats', [DashboardController::class, 'stylistStats']);
});

// Public customer stats (no auth required)
Route::get('/dashboard/customer/stats', [DashboardController::class, 'customerStats']);
