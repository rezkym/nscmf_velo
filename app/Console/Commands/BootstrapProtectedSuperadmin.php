<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Shared\DomainRuleException;
use App\Services\Administration\ProtectedSuperadminBootstrapService;
use Illuminate\Console\Command;

/** Operator-run bootstrap (17 §23). Never schedule it and never run it for production in CI. */
final class BootstrapProtectedSuperadmin extends Command
{
    protected $signature = 'nscmf:bootstrap-superadmin';

    protected $description = 'Create the Protected Superadmin once and reveal its temporary password one time';

    public function handle(ProtectedSuperadminBootstrapService $bootstrap): int
    {
        try {
            $result = $bootstrap->bootstrap();
        } catch (DomainRuleException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if (! $result['created']) {
            $this->info('The Protected Superadmin already exists. Nothing was changed and no password is shown.');

            return self::SUCCESS;
        }

        $this->warn('Username: '.ProtectedSuperadminBootstrapService::USERNAME);
        $this->warn('Temporary password (shown once): '.$result['password']);
        $this->line('Store it safely now. It cannot be shown again; the account must change it at first sign-in.');

        return self::SUCCESS;
    }
}
