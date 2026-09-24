<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration\Audits;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administration\ListAuditRequest;
use App\Models\User;
use App\Services\Audit\AuditReadService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /administration/audits/access|security — read-only (12 §49–50). */
final class AuditController extends Controller
{
    public function __construct(private readonly AuditReadService $audits) {}

    public function access(ListAuditRequest $request): Response
    {
        return Inertia::render('Administration/Audits/Access', $this->audits->accessEvents(self::actor($request), $request->filters()));
    }

    public function security(ListAuditRequest $request): Response
    {
        return Inertia::render('Administration/Audits/Security', $this->audits->securityEvents(self::actor($request), $request->filters()));
    }

    private static function actor(ListAuditRequest $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
