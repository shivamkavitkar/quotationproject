<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Define your allowed frontend origin
        $allowedOrigin = 'http://localhost:3039';

        $origin = $request->header('Origin'); // Get the Origin header from the request

        $headers = [
            'Access-Control-Allow-Methods' => 'POST, GET, OPTIONS, PUT, DELETE', // Methods your API allows
            'Access-Control-Allow-Headers' => 'Content-Type, X-Auth-Token, Origin, Authorization', // Common headers your frontend might send
            'Access-Control-Max-Age' => '86400', // Cache pre-flight request for 24 hours (optional)
        ];

        // Only set Access-Control-Allow-Origin if the request's origin matches our allowed origin.
        // If credentials are used (cookies, authorization headers), Access-Control-Allow-Origin must be specific, not '*'.
        if ($origin === $allowedOrigin) {
            $headers['Access-Control-Allow-Origin'] = $allowedOrigin;
            $headers['Access-Control-Allow-Credentials'] = 'true'; // Set to 'true' if your frontend sends cookies/auth headers
        }
        // else: If the origin does not match, Access-Control-Allow-Origin will not be set for security.
        // You could uncomment the line below for *temporary* debugging, but NEVER use '*' in production with credentials.
        // $headers['Access-Control-Allow-Origin'] = '*';


        // Handle pre-flight OPTIONS requests (browser sends this first for complex requests)
        if ($request->isMethod('OPTIONS')) {
            // For OPTIONS requests, immediately return an OK response with all CORS headers
            return response()->json('OK', 200, $headers);
        }

        // Get the response from the next middleware or your controller
        $response = $next($request);

        // Add the determined CORS headers to the actual response
        foreach ($headers as $key => $value) {
            // THIS IS THE CORRECT SYNTAX FOR ADDING HEADERS TO A RESPONSE INSTANCE
            $response->header($key, $value);
        }

        return $response;
    }
}