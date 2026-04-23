<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadStorage
{
    public static function diskName(): string
    {
        return (string) config('uploads.disk', 'public');
    }

    public static function store(UploadedFile $file, string $directory): string
    {
        return Storage::disk(self::diskName())->putFile(trim($directory, '/'), $file);
    }

    public static function url(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (self::isAbsoluteUrl($path)) {
            return $path;
        }

        $normalized = ltrim((string) $path, '/');

        if (self::isLegacyPublicPath($normalized)) {
            return url($normalized);
        }

        return Storage::disk(self::diskName())->url($normalized);
    }

    public static function delete(?string $path): void
    {
        $normalized = self::normalizeStoredPath($path);

        if (!$normalized) {
            return;
        }

        if (self::isLegacyPublicPath($normalized)) {
            $absolutePath = public_path($normalized);

            if (is_file($absolutePath)) {
                @unlink($absolutePath);
            }

            return;
        }

        Storage::disk(self::diskName())->delete($normalized);
    }

    public static function normalizeStoredPath(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $value = trim((string) $path);

        if ($value === '') {
            return null;
        }

        if (!self::isAbsoluteUrl($value)) {
            return ltrim($value, '/');
        }

        $urlPath = ltrim((string) parse_url($value, PHP_URL_PATH), '/');

        if ($urlPath === '') {
            return null;
        }

        if (self::isLegacyPublicPath($urlPath)) {
            return $urlPath;
        }

        if (self::diskName() === 'public' && Str::startsWith($urlPath, 'storage/')) {
            return Str::after($urlPath, 'storage/');
        }

        return $urlPath;
    }

    private static function isAbsoluteUrl(string $path): bool
    {
        return Str::startsWith($path, ['http://', 'https://']);
    }

    private static function isLegacyPublicPath(string $path): bool
    {
        return Str::startsWith($path, 'uploads/');
    }
}
