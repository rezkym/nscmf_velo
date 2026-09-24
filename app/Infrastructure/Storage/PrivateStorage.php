<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

/**
 * Private file storage behind every NSCMF binary (11 §39, 14 §48). Keys are opaque,
 * application-relative locators under a category prefix; holding a key never authorizes access.
 * A write that cannot be confirmed throws — callers never record unconfirmed bytes.
 */
interface PrivateStorage
{
    public const string CHUNKS = 'chunks';

    public const string QUARANTINE = 'quarantine';

    public const string ATTACHMENTS = 'attachments';

    public const string EXPORTS = 'exports';

    public const string TEMPLATES = 'templates';

    public const string VALIDATOR = 'validator';

    /** Writes the stream under a new opaque key in $category and returns that key. */
    public function write(string $category, mixed $stream): string;

    /** Writes the stream to an exact key; used where the key is derived deterministically. */
    public function writeAt(string $key, mixed $stream): void;

    /** @return resource */
    public function readStream(string $key): mixed;

    public function exists(string $key): bool;

    public function size(string $key): int;

    public function delete(string $key): void;

    /** Moves an object to a new opaque key in $category and returns that key. */
    public function move(string $key, string $category): string;

    /** Absolute local path, for native tools (renderer, scanner fallback) that need a file. */
    public function localPath(string $key): string;
}
