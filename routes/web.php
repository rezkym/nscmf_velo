<?php

declare(strict_types=1);

use App\Http\Controllers\Account\TemporaryPasswordController;
use App\Http\Controllers\Administration\Roles\RoleController;
use App\Http\Controllers\Administration\SetupController;
use App\Http\Controllers\Administration\Teams\TeamController;
use App\Http\Controllers\Administration\Users\UserController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\ReauthenticateController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Nscmf\CreateNscmfController;
use App\Http\Controllers\Nscmf\RecordController;
use App\Http\Controllers\Nscmf\SaveDraftController;
use App\Http\Controllers\Nscmf\Workflow\SubmitRecordController;
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

    Route::get('/nscmf/create', [CreateNscmfController::class, 'create'])->name('nscmf.create');
    Route::post('/nscmf', [CreateNscmfController::class, 'store'])->name('nscmf.store');
    Route::get('/nscmf/{record}', [RecordController::class, 'show'])->whereNumber('record')->name('nscmf.show');
    Route::get('/nscmf/{record}/edit', [RecordController::class, 'edit'])->whereNumber('record')->name('nscmf.edit');
    Route::patch('/nscmf/{record}/draft', SaveDraftController::class)->whereNumber('record')->name('nscmf.draft');
    Route::post('/nscmf/{record}/submit', SubmitRecordController::class)->whereNumber('record')->name('nscmf.submit');

    Route::prefix('administration')->whereNumber(['team', 'user', 'role'])->group(function (): void {
        Route::get('/setup', SetupController::class)->name('administration.setup');

        Route::get('/teams', [TeamController::class, 'index'])->name('administration.teams.index');
        Route::post('/teams', [TeamController::class, 'store'])->name('administration.teams.store');
        Route::patch('/teams/{team}', [TeamController::class, 'update'])->name('administration.teams.update');
        Route::post('/teams/{team}/deactivate', [TeamController::class, 'deactivate'])->name('administration.teams.deactivate');
        Route::post('/teams/{team}/reactivate', [TeamController::class, 'reactivate'])->name('administration.teams.reactivate');

        Route::get('/users', [UserController::class, 'index'])->name('administration.users.index');
        Route::post('/users', [UserController::class, 'store'])->name('administration.users.store');
        Route::patch('/users/{user}', [UserController::class, 'update'])->name('administration.users.update');
        Route::post('/users/{user}/enable', [UserController::class, 'enable'])->name('administration.users.enable');
        Route::post('/users/{user}/disable', [UserController::class, 'disable'])->name('administration.users.disable');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('administration.users.reset-password');
        Route::put('/users/{user}/roles', [UserController::class, 'roles'])->name('administration.users.roles');
        Route::put('/users/{user}/team', [UserController::class, 'team'])->name('administration.users.team');

        Route::get('/roles', [RoleController::class, 'index'])->name('administration.roles.index');
        Route::post('/roles', [RoleController::class, 'store'])->name('administration.roles.store');
        Route::patch('/roles/{role}', [RoleController::class, 'update'])->name('administration.roles.update');
        Route::put('/roles/{role}/permissions', [RoleController::class, 'permissions'])->name('administration.roles.permissions');
        Route::get('/permissions', [RoleController::class, 'catalog'])->name('administration.permissions.index');
    });
});
