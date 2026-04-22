<?php

namespace App\Http\Middleware;

use App\Services\CustomerOtpSessionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomerOtpRedirectIfUnverified
{
    public function handle(Request $request, Closure $next): Response
    {
        $otpSessions = app(CustomerOtpSessionService::class);

        if ($otpSessions->isVerified($request)) {
            $request->attributes->set('customer_verified_email', $otpSessions->email($request));

            return $next($request);
        }

        return redirect('/manage-booking/start');
    }
}
