<?php

declare(strict_types=1);

use function Pest\Laravel\get;

it('reports the application as healthy', function (): void {
    get('/up')->assertOk();
});
