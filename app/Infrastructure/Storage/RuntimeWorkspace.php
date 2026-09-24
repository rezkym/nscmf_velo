<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Str;

/**
 * Short-lived private scratch directories for renderer and validator work (14 §52). Each job
 * owns one directory and removes it in `finally`; BE-130 removes directories a crashed job left.
 */
final readonly class RuntimeWorkspace
{
    public function __construct(private Filesystem $disk) {}

    /** Creates a fresh directory and returns its absolute path. */
    public function create(string $purpose): string
    {
        $directory = $purpose.'/'.Str::lower((string) Str::ulid());
        $this->disk->makeDirectory($directory);

        return $this->disk->path($directory);
    }

    public function remove(string $absolutePath): void
    {
        $root = rtrim($this->disk->path(''), '/');
        if (str_starts_with($absolutePath, $root.'/')) {
            $this->disk->deleteDirectory(substr($absolutePath, strlen($root) + 1));
        }
    }

    /**
     * Directories under $purpose whose last change is older than $cutoff seconds ago.
     *
     * @return list<string> relative directory paths
     */
    public function staleDirectories(string $purpose, int $olderThanSeconds): array
    {
        $cutoff = time() - $olderThanSeconds;

        return array_values(array_filter(
            $this->disk->directories($purpose),
            fn (string $directory): bool => $this->disk->lastModified($directory) < $cutoff,
        ));
    }

    public function deleteRelative(string $directory): void
    {
        $this->disk->deleteDirectory($directory);
    }
}
