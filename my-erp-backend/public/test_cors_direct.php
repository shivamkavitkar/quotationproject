<?php
// Yeh headers HTML output se pehle hi bhejne hote hain.
header('Access-Control-Allow-Origin: http://localhost:3039'); // Aapka React frontend origin
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); // Allowed HTTP methods
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); // Allowed request headers
header('Access-Control-Max-Age: 86400'); // Pre-flight request ko cache karne ka time
header('Content-Type: application/json'); // Browser ko batayein ki yeh JSON response hai

// Thoda sa JSON data output karein
echo json_encode([
    'status' => 'success',
    'message' => 'Direct PHP CORS test successful! Headers sent.',
    'data' => ['test_value' => 'This is from direct PHP.']
]);
exit(); // Sure karein ki iske baad koi aur output na ho
?>