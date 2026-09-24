<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administration\TechnicalLogSettingRequest;
use App\Models\User;
use App\Services\Settings\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** GET/PATCH /administration/settings/technical-logs (12 §98–99). */
final class TechnicalLogSettingsController extends Controller
{
    public function __construct(private readonly SystemSettingsService $settings) {}

    public function show(Request $request): JsonResponse|Response
    {
        $data = $this->settings->technicalLogs(self::actor($request));

        return $request->expectsJson()
            ? response()->json(['data' => $data, 'meta' => (object) []])->header('Cache-Control', 'no-store, private')
            : Inertia::render('Administration/Settings/TechnicalLogs', ['setting' => $data]);
    }

    public function update(TechnicalLogSettingRequest $request): JsonResponse
    {
        $data = $this->settings->updateTechnicalLogs(self::actor($request), $request->session(), $request->values());

        return response()->json(['data' => $data, 'meta' => (object) []])->header('Cache-Control', 'no-store, private');
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
