<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/** PrivateStorage on the private Laravel `nscmf_private` local disk (20 §8). */
final readonly class LocalPrivateStorage implements PrivateStorage
{
    private const array CATEGORIES = [self::CHUNKS, self::QUARANTINE, self::ATTACHMENTS, self::EXPORTS, self::TEMPLATES, self::VALIDATOR];

    public function __construct(private Filesystem $disk) {}

    public function write(string $category, mixed $stream): string
    {
        $key = $this->newKey($category);
        $this->writeAt($key, $stream);

        return $key;
    }

    public function writeAt(string $key, mixed $stream): void
    {
        self::guardKey($key);
        if (! is_resource($stream) || ! $this->disk->writeStream($key, $stream)) {
            throw new RuntimeException('Private storage write was not confirmed.');
        }
    }

    public function readStream(string $key): mixed
    {
        self::guardKey($key);
        $stream = $this->disk->readStream($key);
        if (! is_resource($stream)) {
            throw new RuntimeException('Private storage object is unreadable.');
        }

        return $stream;
    }

    public function exists(string $key): bool
    {
        self::guardKey($key);

        return $this->disk->exists($key);
    }

    public function size(string $key): int
    {
        self::guardKey($key);

        return $this->disk->size($key);
    }

    public function delete(string $key): void
    {
        self::guardKey($key);
        $this->disk->delete($key);
    }

    public function move(string $key, string $category): string
    {
        self::guardKey($key);
        $target = $this->newKey($category);
        if (! $this->disk->move($key, $target)) {
            throw new RuntimeException('Private storage move was not confirmed.');
        }

        return $target;
    }

    public function localPath(string $key): string
    {
        self::guardKey($key);

        return $this->disk->path($key);
    }

    private function newKey(string $category): string
    {
        if (! in_array($category, self::CATEGORIES, true)) {
            throw new InvalidArgumentException("Unknown private storage category [{$category}].");
        }

        return $category.'/'.now()->format('Y/m').'/'.Str::lower((string) Str::ulid());
    }

    /** Locators are application-relative only; traversal or absolute paths never reach the disk. */
    private static function guardKey(string $key): void
    {
        if ($key === '' || str_starts_with($key, '/') || str_contains($key, '..') || str_contains($key, '\\')) {
            throw new InvalidArgumentException('Invalid private storage key.');
        }
    }
}
