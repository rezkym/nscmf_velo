<?php

declare(strict_types=1);

use App\Http\Controllers\Account\TemporaryPasswordController;
use App\Http\Controllers\Administration\Audits\AuditController;
use App\Http\Controllers\Administration\Roles\RoleController;
use App\Http\Controllers\Administration\Settings\TechnicalLogSettingsController;
use App\Http\Controllers\Administration\SetupController;
use App\Http\Controllers\Administration\Teams\TeamController;
use App\Http\Controllers\Administration\Users\UserController;
use App\Http\Controllers\Approval\ApprovalDetailController;
use App\Http\Controllers\Approval\ApprovalQueueController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\ReauthenticateController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\History\HistoryController;
use App\Http\Controllers\Nscmf\AttachmentController;
use App\Http\Controllers\Nscmf\AttachmentUploadController;
use App\Http\Controllers\Nscmf\CreateNscmfController;
use App\Http\Controllers\Nscmf\DownloadAttachmentController;
use App\Http\Controllers\Nscmf\ExportController;
use App\Http\Controllers\Nscmf\RecordController;
use App\Http\Controllers\Nscmf\RecordTimelineController;
use App\Http\Controllers\Nscmf\SaveChangeResultsController;
use App\Http\Controllers\Nscmf\SaveDraftController;
use App\Http\Controllers\Nscmf\Workflow\ApprovalActionController;
use App\Http\Controllers\Nscmf\Workflow\LifecycleActionController;
use App\Http\Controllers\Nscmf\Workflow\ReviewForwardController;
use App\Http\Controllers\Nscmf\Workflow\ReviewRejectController;
use App\Http\Controllers\Nscmf\Workflow\ReviewReturnController;
use App\Http\Controllers\Nscmf\Workflow\SubmitRecordController;
use App\Http\Controllers\PublicValidatorController;
use App\Http\Controllers\Review\ReviewDetailController;
use App\Http\Controllers\Review\ReviewQueueController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome', [
    'appName' => config('app.name'),
]))->name('home');

// The only public, no-login capability (12 §72–75); the public ingress exposes nothing else.
Route::get('/ispdfvalid', [PublicValidatorController::class, 'show'])->name('ispdfvalid');
Route::post('/ispdfvalid/verify', [PublicValidatorController::class, 'verify'])->middleware('throttle:pdf-validator')->name('ispdfvalid.verify');

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

    Route::get('/review', ReviewQueueController::class)->name('review.index');
    Route::get('/review/{record}', ReviewDetailController::class)->whereNumber('record')->name('review.show');

    Route::get('/approval', ApprovalQueueController::class)->name('approval.index');
    Route::get('/approval/{record}', ApprovalDetailController::class)->whereNumber('record')->name('approval.show');

    Route::get('/history', HistoryController::class)->name('history.index');

    Route::get('/nscmf/create', [CreateNscmfController::class, 'create'])->name('nscmf.create');
    Route::post('/nscmf', [CreateNscmfController::class, 'store'])->name('nscmf.store');
    Route::get('/nscmf/{record}', [RecordController::class, 'show'])->whereNumber('record')->name('nscmf.show');
    Route::get('/nscmf/{record}/timeline', RecordTimelineController::class)->whereNumber('record')->name('nscmf.timeline');
    Route::controller(AttachmentUploadController::class)->prefix('/nscmf/{record}/attachment-uploads')
        ->whereNumber('record')->where(['upload' => '[0-9a-z]{26}'])->group(function (): void {
            Route::middleware('throttle:nscmf-uploads')->group(function (): void {
                Route::post('/', 'store')->name('nscmf.uploads.store');
                Route::get('/{upload}', 'show')->name('nscmf.uploads.show');
                Route::put('/{upload}/chunks/{chunk}', 'chunk')->whereNumber('chunk')->name('nscmf.uploads.chunk');
                Route::delete('/{upload}', 'destroy')->name('nscmf.uploads.destroy');
            });
            Route::post('/{upload}/complete', 'complete')->middleware('throttle:nscmf-upload-finalize')->name('nscmf.uploads.complete');
        });
    Route::get('/nscmf/{record}/attachments/{attachment}', [AttachmentController::class, 'show'])->whereNumber(['record', 'attachment'])->name('nscmf.attachments.show');
    Route::delete('/nscmf/{record}/attachments/{attachment}', [AttachmentController::class, 'destroy'])->whereNumber(['record', 'attachment'])->name('nscmf.attachments.destroy');
    Route::controller(ExportController::class)->group(function (): void {
        Route::post('/nscmf/{record}/exports', 'store')->whereNumber('record')->name('nscmf.exports.store');
        Route::get('/nscmf/{record}/exports', 'index')->whereNumber('record')->name('nscmf.exports.index');
        Route::post('/nscmf/exports/bulk', 'bulk')->name('nscmf.exports.bulk');
        Route::get('/nscmf/exports/{export}', 'show')->whereNumber('export')->name('nscmf.exports.show');
        Route::get('/nscmf/exports/{export}/download', 'download')->whereNumber('export')->name('nscmf.exports.download');
        Route::get('/nscmf/export-batches/{batch}', 'batch')->whereNumber('batch')->name('nscmf.export-batches.show');
        Route::get('/nscmf/export-batches/{batch}/download', 'package')->whereNumber('batch')->name('nscmf.export-batches.download');
    });
    Route::get('/nscmf/{record}/attachments/{attachment}/download', DownloadAttachmentController::class)->whereNumber(['record', 'attachment'])->name('nscmf.attachments.download');
    Route::get('/nscmf/{record}/edit', [RecordController::class, 'edit'])->whereNumber('record')->name('nscmf.edit');
    Route::patch('/nscmf/{record}/draft', SaveDraftController::class)->whereNumber('record')->name('nscmf.draft');
    Route::patch('/nscmf/{record}/change-results', SaveChangeResultsController::class)->whereNumber('record')->name('nscmf.change-results');
    Route::post('/nscmf/{record}/submit', SubmitRecordController::class)->whereNumber('record')->name('nscmf.submit');
    Route::post('/nscmf/{record}/review/return', ReviewReturnController::class)->whereNumber('record')->name('nscmf.review.return');
    Route::post('/nscmf/{record}/review/forward', ReviewForwardController::class)->whereNumber('record')->name('nscmf.review.forward');
    Route::post('/nscmf/{record}/review/reject', ReviewRejectController::class)->whereNumber('record')->name('nscmf.review.reject');
    Route::controller(ApprovalActionController::class)->prefix('/nscmf/{record}/approval')->whereNumber('record')->group(function (): void {
        Route::post('/approve', 'approve')->name('nscmf.approval.approve');
        Route::post('/return-reviewer', 'returnToReviewer')->name('nscmf.approval.return-reviewer');
        Route::post('/return-requester', 'returnToRequester')->name('nscmf.approval.return-requester');
        Route::post('/reject', 'reject')->name('nscmf.approval.reject');
    });
    Route::controller(LifecycleActionController::class)->prefix('/nscmf/{record}')->whereNumber('record')->group(function (): void {
        Route::post('/cancel', 'cancel')->name('nscmf.cancel');
        Route::post('/reopen', 'reopen')->name('nscmf.reopen');
        Route::post('/archive', 'archive')->name('nscmf.archive');
        Route::post('/unarchive', 'unarchive')->name('nscmf.unarchive');
    });

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

        Route::get('/settings/technical-logs', [TechnicalLogSettingsController::class, 'show'])->name('administration.settings.technical-logs');
        Route::patch('/settings/technical-logs', [TechnicalLogSettingsController::class, 'update'])->name('administration.settings.technical-logs.update');

        Route::get('/audits/access', [AuditController::class, 'access'])->name('administration.audits.access');
        Route::get('/audits/security', [AuditController::class, 'security'])->name('administration.audits.security');
    });
});
