<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'userType' => \App\Http\Middleware\EnsureUserType::class,
            'auth.any' => \App\Http\Middleware\AuthenticateAnyGuard::class,
            'customer.otp' => \App\Http\Middleware\CustomerOtpVerified::class,
            'customer.booking' => \App\Http\Middleware\ReturningBookingVerified::class,
            'customer.otp.web' => \App\Http\Middleware\CustomerOtpRedirectIfUnverified::class,
        ]);
        
        // Use custom CSRF middleware
        $middleware->validateCsrfTokens(except: [
            // No routes excluded - all should have CSRF protection
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
