<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MediaUploader
{
    public static function store(
        ?UploadedFile $file,
        string $directory,
        ?string $existingPath = null
    ): ?string {
        if (! $file) {
            return $existingPath;
        }

        $path = $file->store($directory, 'public');

        if ($existingPath && $existingPath !== $path) {
            self::delete($existingPath);
        }

        return $path;
    }

    public static function storeMany(array $files, string $directory): array
    {
        return collect($files)
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->map(fn (UploadedFile $file) => $file->store($directory, 'public'))
            ->values()
            ->all();
    }

    public static function delete(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return url(Storage::disk('public')->url($path));
    }
}
