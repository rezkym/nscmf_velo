<?php

declare(strict_types=1);

arch('project-owned PHP classes declare strict types', function (): void {
    expect(['App', 'Database', 'Tests'])->toUseStrictTypes();
});

arch('debugging helpers are not left in project code', function (): void {
    expect(['dd', 'dump', 'ddd', 'ray', 'var_dump', 'print_r'])->not->toBeUsed();
});
