<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Shared\DomainRuleException;
use App\Services\Export\TemplateRegistryService;
use Illuminate\Console\Command;

/** Operator provisioning of the official workbook (14 §69). */
final class RegisterTemplate extends Command
{
    protected $signature = 'nscmf:template:register {path : The approved official XLSX} {--label= : Version label} {--activate : Make it the active version}';

    protected $description = 'Register an official NSCMF workbook as an immutable, hash-verified template version';

    public function handle(TemplateRegistryService $registry): int
    {
        $path = $this->argument('path');
        if (! is_file($path)) {
            $this->error('The template file does not exist.');

            return self::FAILURE;
        }
        $label = $this->option('label');

        try {
            $template = $registry->register($path, is_string($label) && $label !== '' ? $label : pathinfo($path, PATHINFO_FILENAME), (bool) $this->option('activate'));
        } catch (DomainRuleException) {
            $this->error('The stored template failed hash verification.');

            return self::FAILURE;
        }

        $this->info("Template {$template->version_label} ({$template->template_sha256}) registered".($template->is_active ? ' and active.' : '.'));

        return self::SUCCESS;
    }
}
