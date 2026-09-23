<?php

declare(strict_types=1);

namespace App\Providers;

use App\Repositories\Contracts\Administration\RolePermissionRepository;
use App\Repositories\Contracts\Administration\TeamRepository;
use App\Repositories\Contracts\Administration\UserRepository;
use App\Repositories\Contracts\Attachment\AttachmentRepository;
use App\Repositories\Contracts\Audit\AccessAuditRepository;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use App\Repositories\Contracts\Audit\SecurityAuditRepository;
use App\Repositories\Contracts\Export\ExportRepository;
use App\Repositories\Contracts\Export\SigningCertificateRepository;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\NumberSequenceRepository;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use App\Repositories\Contracts\Nscmf\WorkflowRepository;
use App\Repositories\Contracts\Security\SessionRepository;
use App\Repositories\Eloquent\Administration\EloquentTeamRepository;
use App\Repositories\Eloquent\Administration\EloquentUserRepository;
use App\Repositories\Eloquent\Administration\SpatieRolePermissionRepository;
use App\Repositories\Eloquent\Attachment\EloquentAttachmentRepository;
use App\Repositories\Eloquent\Audit\EloquentAccessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentBusinessAuditRepository;
use App\Repositories\Eloquent\Audit\EloquentSecurityAuditRepository;
use App\Repositories\Eloquent\Export\EloquentExportRepository;
use App\Repositories\Eloquent\Export\EloquentSigningCertificateRepository;
use App\Repositories\Eloquent\Nscmf\EloquentNscmfRepository;
use App\Repositories\Eloquent\Nscmf\EloquentRecordEvidenceRepository;
use App\Repositories\Eloquent\Nscmf\EloquentWorkflowRepository;
use App\Repositories\Eloquent\Nscmf\MySqlNumberSequenceRepository;
use App\Repositories\Eloquent\Security\DatabaseSessionRepository;
use Illuminate\Support\ServiceProvider;

/** Explicit repository contract bindings (13 §25). */
class RepositoryServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    public array $bindings = [
        BusinessAuditRepository::class => EloquentBusinessAuditRepository::class,
        AccessAuditRepository::class => EloquentAccessAuditRepository::class,
        SecurityAuditRepository::class => EloquentSecurityAuditRepository::class,
        UserRepository::class => EloquentUserRepository::class,
        RolePermissionRepository::class => SpatieRolePermissionRepository::class,
        SessionRepository::class => DatabaseSessionRepository::class,
        TeamRepository::class => EloquentTeamRepository::class,
        SigningCertificateRepository::class => EloquentSigningCertificateRepository::class,
        NscmfRepository::class => EloquentNscmfRepository::class,
        RecordEvidenceRepository::class => EloquentRecordEvidenceRepository::class,
        NumberSequenceRepository::class => MySqlNumberSequenceRepository::class,
        WorkflowRepository::class => EloquentWorkflowRepository::class,
        AttachmentRepository::class => EloquentAttachmentRepository::class,
        ExportRepository::class => EloquentExportRepository::class,
    ];
}
