<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use App\Domain\Shared\DomainRuleException;
use App\Services\Testing\BrowserFixtureService;
use Illuminate\Console\Command;

/** Prints one synthetic account as JSON for the calling Playwright process (BE-005). */
final class CreateBrowserUserCommand extends Command
{
    protected $signature = 'nscmf:browser-testing:user
        {--role=* : Existing role names to assign}
        {--permission=* : Extra permissions through a throw-away role}
        {--team : Give the user a new active Team}
        {--must-change-password : Require a password change at first sign-in}
        {--protected-superadmin : Create the protected identity}
        {--json : Print the result as one JSON line}';

    protected $description = 'Create a synthetic browser-test account inside the guarded disposable runtime';

    public function handle(BrowserFixtureService $fixtures): int
    {
        try {
            $user = $fixtures->createUser(
                self::strings($this->option('role')),
                self::strings($this->option('permission')),
                (bool) $this->option('team'),
                (bool) $this->option('must-change-password'),
                (bool) $this->option('protected-superadmin'),
            );
        } catch (DomainRuleException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->line(json_encode($user, JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private static function strings(mixed $values): array
    {
        return is_array($values) ? array_values(array_filter($values, 'is_string')) : [];
    }
}
