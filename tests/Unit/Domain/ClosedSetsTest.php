<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NscmfSubtype;
use App\Domain\Nscmf\Enums\ServiceImpactCode;

/*
 * BE-021 / T05A — closed sets and domain primitives (05 §4, 06 §15–16, 04 §12–20, 17 §12–14).
 */

it('has exactly the seven canonical business states', function (): void {
    expect(array_map(fn (NscmfStatus $s) => $s->value, NscmfStatus::cases()))->toBe([
        'DRAFT', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'CANCELLED',
    ])
        ->and(NscmfStatus::tryFrom('ARCHIVED'))->toBeNull()
        ->and(NscmfStatus::tryFrom('COMPLETED'))->toBeNull()
        ->and(NscmfStatus::tryFrom('draft'))->toBeNull();
});

it('knows which states were never submitted and which are editable Draft states', function (): void {
    expect(NscmfStatus::DRAFT->isNeverSubmitted())->toBeTrue()
        ->and(NscmfStatus::CANCELLED->isNeverSubmitted())->toBeTrue()
        ->and(NscmfStatus::PENDING_REVIEW->isNeverSubmitted())->toBeFalse()
        ->and(NscmfStatus::DRAFT->allowsDraftEdit())->toBeTrue()
        ->and(NscmfStatus::REVISION_REQUIRED->allowsDraftEdit())->toBeTrue()
        ->and(NscmfStatus::PENDING_REVIEW->allowsDraftEdit())->toBeFalse();
});

it('accepts only family-valid subtypes', function (): void {
    expect(NscmfFamily::ACTIVATION->allows(NscmfSubtype::UPGRADE_DOWNGRADE))->toBeTrue()
        ->and(NscmfFamily::ACTIVATION->allows(NscmfSubtype::MAINTENANCE))->toBeFalse()
        ->and(NscmfFamily::CHANGE->allows(NscmfSubtype::EMERGENCY))->toBeTrue()
        ->and(NscmfFamily::CHANGE->allows(NscmfSubtype::DEACTIVATION))->toBeFalse()
        ->and(array_map(fn (NscmfSubtype $s) => $s->value, NscmfFamily::CHANGE->subtypes()))->toBe(['MAINTENANCE', 'UPGRADE', 'EMERGENCY']);
});

it('keeps Service Impact codes as form values, never permissions', function (): void {
    $permissions = PermissionCatalog::all();

    foreach (ServiceImpactCode::cases() as $impact) {
        foreach ($permissions as $permission) {
            expect(strtolower($permission))->not->toContain(strtolower($impact->value));
        }
    }
});

it('materializes the exact permission catalog without wildcards or session permissions', function (): void {
    $all = PermissionCatalog::all();

    expect($all)->toHaveCount(42)
        ->and($all)->toContain('nscmf.change.result.edit', 'nscmf.analytics.view', 'users.assign_team', 'teams.assign_users', 'system.settings.manage')
        ->and($all)->not->toContain('roles.archive')
        ->and($all)->not->toContain('session.login')
        ->and($all)->not->toContain('session.logout')
        ->and(array_filter($all, fn (string $p) => str_contains($p, '*')))->toBe([])
        ->and($all)->toBe(array_values(array_unique($all)));
});

it('defines the four default role bundles from 04 §33–36, analytics for Superadmin only (04 §12.1)', function (): void {
    $bundles = PermissionCatalog::defaultRoleBundles();

    expect(array_keys($bundles))->toBe(['Superadmin', 'Requester', 'Reviewer', 'Approver'])
        ->and($bundles['Superadmin'])->toBe(PermissionCatalog::all())
        ->and($bundles['Requester'])->toEqualCanonicalizing([
            'nscmf.create', 'nscmf.view', 'nscmf.view.history', 'nscmf.draft.edit', 'nscmf.submit', 'nscmf.cancel',
            'nscmf.change.result.edit', 'nscmf.attachment.manage', 'nscmf.timeline.view', 'nscmf.export', 'nscmf.export.bulk',
        ])
        ->and($bundles['Reviewer'])->toEqualCanonicalizing([
            'nscmf.view', 'nscmf.view.history', 'nscmf.review', 'nscmf.review.forward', 'nscmf.review.return',
            'nscmf.review.reject', 'nscmf.timeline.view', 'nscmf.export', 'nscmf.export.bulk',
        ])
        ->and($bundles['Approver'])->toEqualCanonicalizing([
            'nscmf.view', 'nscmf.view.history', 'nscmf.approve', 'nscmf.approval.return_reviewer',
            'nscmf.approval.return_requester', 'nscmf.approval.reject', 'nscmf.timeline.view', 'nscmf.export', 'nscmf.export.bulk',
        ]);
});
