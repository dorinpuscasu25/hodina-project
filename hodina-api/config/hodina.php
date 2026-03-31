<?php

return [
    'supported_locales' => [
        'en' => 'English',
        'ro' => 'Romanian',
        'ru' => 'Russian',
    ],

    'frontend_url' => env('HODINA_FRONTEND_URL', 'http://localhost:5173'),
    'dashboard_url' => env('HODINA_DASHBOARD_URL', 'http://localhost:5174'),
    'session_generation_days' => env('HODINA_SESSION_GENERATION_DAYS', 90),
];
