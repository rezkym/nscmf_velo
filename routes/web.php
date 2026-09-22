<?php

declare(strict_types=1);

use App\Http\Controllers\Account\TemporaryPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\ReauthenticateController;
use App\Http\Controllers\Dashboard\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome', [
    'appName' => config('app.name'),
]))->name('home');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->name('login.store');
});

Route::middleware('auth')->group(function (): void {
    Route::post('/logout', LogoutController::class)->name('logout');
    Route::get('/account/temporary-password', [TemporaryPasswordController::class, 'show'])->name('account.temporary-password');
    Route::post('/account/temporary-password/change', [TemporaryPasswordController::class, 'update'])->name('account.temporary-password.change');
    Route::post('/account/re-authenticate', ReauthenticateController::class)->name('account.reauthenticate');

    Route::get('/dashboard', DashboardController::class)->name('dashboard');
});
