import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

/**
 * The disposable browser runtime (BE-005, G08). Every value is explicit: the served process and
 * every fixture command run with APP_ENV=testing against the disposable MySQL database and an
 * isolated private storage root, and the application's own boot guard refuses anything else.
 */
const root = path.resolve(import.meta.dirname, '../../..');
const browserStorage = path.join(root, 'storage/framework/testing/browser');

export const BROWSER_PORT = tcpPort('NSCMF_BROWSER_APP_PORT', process.env.NSCMF_BROWSER_APP_PORT ?? '8010');
export const BROWSER_GUARD_PROBE_PORT = tcpPort(
    'NSCMF_BROWSER_GUARD_PROBE_PORT',
    process.env.NSCMF_BROWSER_GUARD_PROBE_PORT ?? String(BROWSER_PORT + 1),
);

if (BROWSER_PORT === BROWSER_GUARD_PROBE_PORT) {
    throw new Error('NSCMF_BROWSER_GUARD_PROBE_PORT must differ from NSCMF_BROWSER_APP_PORT.');
}

export const BROWSER_BASE_URL = `http://127.0.0.1:${BROWSER_PORT}`;
export const BROWSER_SERVER_CHECK_URL = `${BROWSER_BASE_URL}/up`;

export const browserRuntimeEnv: Record<string, string> = {
    APP_ENV: 'testing',
    APP_DEBUG: 'false',
    APP_URL: BROWSER_BASE_URL,
    NSCMF_BROWSER_TESTING: 'true',
    DB_CONNECTION: 'mysql',
    DB_HOST: process.env.NSCMF_BROWSER_DB_HOST ?? '127.0.0.1',
    DB_PORT: String(tcpPort('NSCMF_BROWSER_DB_PORT', process.env.NSCMF_BROWSER_DB_PORT ?? '3306')),
    DB_DATABASE: process.env.NSCMF_BROWSER_DB_DATABASE ?? 'nscmf_testing',
    SESSION_DRIVER: 'database',
    CACHE_STORE: 'database',
    QUEUE_CONNECTION: 'database',
    MAIL_MAILER: 'array',
    LOG_CHANNEL: 'single',
    NSCMF_PRIVATE_STORAGE_ROOT: path.join(browserStorage, 'private'),
    NSCMF_RUNTIME_TMP_ROOT: path.join(browserStorage, 'tmp'),
    // A throw-away Organization signer for this runtime only (never the development key).
    NSCMF_SIGNING_P12_PATH: path.join(browserStorage, 'signing/organization.p12'),
    NSCMF_SIGNING_P12_PASSPHRASE: 'browser-runtime-only-passphrase',
};

function tcpPort(name: string, value: string | number): number {
    const port = Number(value);
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(port) || port < 1 || port > 65_535) {
        throw new Error(`${name} must be a finite TCP port between 1 and 65535.`);
    }

    return port;
}

function runArtisan(args: string[]): string {
    return execFileSync('php', ['artisan', ...args], {
        cwd: root,
        env: { ...process.env, ...browserRuntimeEnv },
        encoding: 'utf8',
    });
}

export function prepareBrowserRuntime(): void {
    runArtisan(['nscmf:browser-testing:prepare']);
}

/** Runs every queued job once (upload finalization, export generation); there is no worker. */
export function runQueuedJobs(): void {
    runArtisan(['queue:work', '--stop-when-empty', '--tries=1']);
}

/** Registers the private official workbook and a fresh signer, as an operator would. */
export function provisionExports(): void {
    runArtisan(['nscmf:template:register', path.join(root, 'NSCMF-Form-3.0.xlsx'), '--activate']);
    runArtisan(['nscmf:signing:activate', '--generate']);
}

export interface BrowserUser {
    id: number;
    username: string;
    password: string;
    name: string;
    team: { id: number; name: string } | null;
    runtime: { environment: string; database: string };
}

export interface BrowserUserOptions {
    roles?: string[];
    permissions?: string[];
    team?: boolean;
    mustChangePassword?: boolean;
    protectedSuperadmin?: boolean;
}

/** Creates a synthetic account inside the disposable runtime; its password is random per run. */
export function createBrowserUser(options: BrowserUserOptions = {}): BrowserUser {
    const args = ['nscmf:browser-testing:user', '--json'];
    for (const role of options.roles ?? []) args.push(`--role=${role}`);
    for (const permission of options.permissions ?? []) args.push(`--permission=${permission}`);
    if (options.team) args.push('--team');
    if (options.mustChangePassword) args.push('--must-change-password');
    if (options.protectedSuperadmin) args.push('--protected-superadmin');

    const output = runArtisan(args).trim().split('\n').at(-1) ?? '';
    return JSON.parse(output) as BrowserUser;
}

/**
 * Starts a second served process with one unsafe override (for example the development database)
 * to prove the boot guard runs inside the served application itself, not only inside Pest.
 */
export function startUnsafeServer(port: number, overrides: Record<string, string>): ChildProcess {
    const safePort = tcpPort('unsafe browser guard probe port', port);

    return spawn(
        'php',
        ['-S', `127.0.0.1:${safePort}`, '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'],
        {
            cwd: path.join(root, 'public'),
            env: { ...process.env, ...browserRuntimeEnv, ...overrides },
            stdio: 'ignore',
        },
    );
}
