<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CorsMiddleware; // <-- This line ensures your custom middleware is available

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // This registers your custom CorsMiddleware for API routes.
        // It appends it to the existing API middleware group.
        $middleware->api(append: [
            CorsMiddleware::class, // <-- This is your custom CORS middleware
            // If you had the 'fruitcake/laravel-cors' package's middleware here before,
            // make sure it's commented out or removed, so only your custom one is active.
            // For example: // \Fruitcake\Cors\HandleCors::class,
            // You might also have Sanctum middleware here if you are using it for API authentication:
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // If you needed CORS for web routes (less common for SPAs with a separate API), you'd add it here:
        // $middleware->web(append: [
        //     CorsMiddleware::class,
        // ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ... (existing content for exception handling)
    })->create();