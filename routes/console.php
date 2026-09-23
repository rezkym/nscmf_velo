<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

/*
 * Required scheduled responsibilities (14 §99). Business workflow is never automated here.
 */
Schedule::command('nscmf:cleanup uploads')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('nscmf:cleanup exports')->hourly()->withoutOverlapping();
Schedule::command('nscmf:cleanup runtime')->hourly()->withoutOverlapping();
Schedule::command('nscmf:cleanup technical-logs')->dailyAt('01:00')->timezone('Asia/Jakarta')->withoutOverlapping();
