<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Public Upload Disk
    |--------------------------------------------------------------------------
    |
    | This disk is used for public media uploads such as service images,
    | stylist photos, QR codes, and payment proofs. Keep this as "public"
    | locally, and switch it to "s3" on Railway if you add object storage.
    |
    */
    'disk' => env('UPLOADS_DISK', 'public'),
];
