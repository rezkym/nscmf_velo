<?php

declare(strict_types=1);

namespace App\Services\Export;

use App\Domain\Export\NscmfFormMappingV1;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Storage\PrivateStorage;
use App\Models\Export\TemplateVersion;
use App\Repositories\Contracts\Export\ExportRepository;
use RuntimeException;

/**
 * Official template provisioning and readiness (14 §66–70, BE-105): a registered binary is
 * immutable, content-addressed and hash-verified before every use.
 */
final readonly class TemplateRegistryService
{
    public function __construct(
        private ExportRepository $exports,
        private PrivateStorage $storage,
    ) {}

    /** Registers the workbook once per SHA-256; re-registering the same bytes is a no-op. */
    public function register(string $path, string $label, bool $activate): TemplateVersion
    {
        $sha256 = hash_file('sha256', $path);
        if ($sha256 === false) {
            throw new RuntimeException('The template file is unreadable.');
        }

        $template = $this->exports->templateBySha($sha256);
        if ($template === null) {
            $key = "templates/{$sha256}.xlsx";
            $stream = fopen($path, 'rb');
            if ($stream === false) {
                throw new RuntimeException('The template file is unreadable.');
            }
            try {
                $this->storage->writeAt($key, $stream);
            } finally {
                fclose($stream);
            }
            $template = $this->exports->createTemplate([
                'version_label' => $label,
                'private_object_key' => $key,
                'template_sha256' => $sha256,
                'mapping_version' => NscmfFormMappingV1::VERSION,
                'is_active' => false,
            ]);
            $this->verifiedPath($template);
        }

        if ($activate) {
            $this->exports->activateTemplate($template);
        }

        return $template;
    }

    /** The active template, provided its stored bytes still match the registered hash. */
    public function activeVerified(): TemplateVersion
    {
        $template = $this->exports->activeTemplate() ?? throw self::notReady();
        $this->verifiedPath($template);

        return $template;
    }

    /** Absolute path of a template whose bytes match its registered hash (hash mismatch is critical). */
    public function verifiedPath(TemplateVersion $template): string
    {
        if ($template->mapping_version !== NscmfFormMappingV1::VERSION || ! $this->storage->exists($template->private_object_key)) {
            throw self::notReady();
        }
        $path = $this->storage->localPath($template->private_object_key);
        if (hash_file('sha256', $path) !== $template->template_sha256) {
            throw self::notReady();
        }

        return $path;
    }

    private static function notReady(): DomainRuleException
    {
        return new DomainRuleException('EXPORT_NOT_READY', 'Exports are not available: the official template is not ready.', 409);
    }
}
