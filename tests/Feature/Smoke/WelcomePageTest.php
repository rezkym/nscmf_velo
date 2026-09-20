<?php

declare(strict_types=1);

use Inertia\Testing\AssertableInertia;

use function Pest\Laravel\get;

it('renders the welcome page through Inertia with the application name', function (): void {
    get('/')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('Welcome')
            ->where('appName', config('app.name')));
});
