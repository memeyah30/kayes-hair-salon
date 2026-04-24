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
            return '/' . $normalized;
        }

        $resolvedUrl = Storage::disk(self::diskName())->url($normalized);

        if (self::diskName() === 'public') {
            return self::normalizePublicUrlPath($resolvedUrl);
        }

        return $resolvedUrl;
    }

    public static function delete(?string $path): void
    {
        $normalized = self::normalizeStoredPath($path);

        if (!$normalized) {
            return;
        }

        if (self::isLegacyPublicPath($normalized)) {
            $absolutePath = public_path($normalized);
            $deletedLegacyFile = false;

            if (is_file($absolutePath)) {
                @unlink($absolutePath);
                $deletedLegacyFile = true;
            }

            // Many newer uploads are stored on the "public" disk under
            // storage/app/public/uploads/... while keeping the same relative path.
            if (!$deletedLegacyFile || Storage::disk(self::diskName())->exists($normalized)) {
                Storage::disk(self::diskName())->delete($normalized);
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

    private static function usesLegacyPublicFile(string $path): bool
    {
        return self::isLegacyPublicPath($path) && is_file(public_path($path));
    }

    private static function normalizePublicUrlPath(string $url): string
    {
        if (!self::isAbsoluteUrl($url)) {
            return '/' . ltrim($url, '/');
        }

        $parsedPath = parse_url($url, PHP_URL_PATH);

        return $parsedPath
            ? '/' . ltrim($parsedPath, '/')
            : $url;
    }
}
