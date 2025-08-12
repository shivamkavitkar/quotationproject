<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines which domains may access your API via
    | cross-origin HTTP requests. You are free to adjust these settings.
    |
    | Please see: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'], // Allows CORS for all API routes and Sanctum's CSRF cookie

    'allowed_methods' => ['*'], // Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    
    'allowed_origins' => [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3039', // <-- YAHAN ADD KAREIN
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [], // Use this for regex patterns if needed

    'allowed_headers' => ['*'], // Allows all headers from the client

    'exposed_headers' => [], // Headers your backend might send that the frontend needs to access (e.g., custom headers)

    'max_age' => 0, // How long the pre-flight request can be cached (0 means no cache, 3600 is common for 1 hour)

    'supports_credentials' => false, // Set to true if you are sending cookies/authentication headers (e.g., Sanctum with SPA authentication)

];