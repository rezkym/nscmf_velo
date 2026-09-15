<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('stores passwords as hashes instead of the supplied plaintext', function (): void {
    $user = new User([
        'name' => 'Example User',
        'email' => 'example.user@example.com',
        'password' => 'secret-password',
    ]);

    expect($user->password)->not->toBe('secret-password')
        ->and(Hash::check('secret-password', $user->password))->toBeTrue();
});

it('never exposes the password hash or remember token when serialized', function (): void {
    $user = new User([
        'name' => 'Example User',
        'email' => 'example.user@example.com',
        'password' => 'secret-password',
    ]);
    $user->setRememberToken('remember-token-value');

    expect($user->toArray())->not->toHaveKeys(['password', 'remember_token']);
});
