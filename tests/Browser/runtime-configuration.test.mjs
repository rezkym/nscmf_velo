import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const runtimeUrl = pathToFileURL(path.join(root, 'tests/Browser/support/runtime.ts')).href;

function dotenvValue(name, fallback) {
    const line = readFileSync(path.join(root, '.env'), 'utf8')
        .split(/\r?\n/)
        .find((entry) => entry.startsWith(`${name}=`));

    return line === undefined ? fallback : line.slice(name.length + 1);
}

function inspectRuntime(overrides = {}) {
    const script = `
        import * as runtime from ${JSON.stringify(runtimeUrl)};
        process.stdout.write(JSON.stringify({
            port: runtime.BROWSER_PORT,
            guardProbePort: runtime.BROWSER_GUARD_PROBE_PORT ?? null,
            baseUrl: runtime.BROWSER_BASE_URL,
            serverCheckUrl: runtime.BROWSER_SERVER_CHECK_URL ?? null,
            environment: runtime.browserRuntimeEnv,
        }));
    `;

    return JSON.parse(
        execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, ...overrides },
        }),
    );
}

test('browser runtime resolves the worktree database and isolated default ports', () => {
    const runtime = inspectRuntime();

    assert.deepEqual(runtime, {
        port: 8010,
        guardProbePort: 8011,
        baseUrl: 'http://127.0.0.1:8010',
        serverCheckUrl: 'http://127.0.0.1:8010/up',
        environment: {
            APP_ENV: 'testing',
            APP_DEBUG: 'false',
            APP_URL: 'http://127.0.0.1:8010',
            NSCMF_BROWSER_TESTING: 'true',
            DB_CONNECTION: 'mysql',
            DB_HOST: dotenvValue('DB_HOST', '127.0.0.1'),
            DB_PORT: dotenvValue('DB_PORT', '3306'),
            DB_DATABASE: dotenvValue('DB_DATABASE', 'nscmf_testing'),
            SESSION_DRIVER: 'database',
            CACHE_STORE: 'database',
            QUEUE_CONNECTION: 'database',
            MAIL_MAILER: 'array',
            LOG_CHANNEL: 'single',
            NSCMF_PRIVATE_STORAGE_ROOT: path.join(root, 'storage/framework/testing/browser/private'),
            NSCMF_RUNTIME_TMP_ROOT: path.join(root, 'storage/framework/testing/browser/tmp'),
        },
    });
});

test('browser runtime forwards dedicated overrides to every served and fixture process', () => {
    const runtime = inspectRuntime({
        NSCMF_BROWSER_APP_PORT: '8021',
        NSCMF_BROWSER_GUARD_PROBE_PORT: '8022',
        NSCMF_BROWSER_DB_HOST: '127.0.0.1',
        NSCMF_BROWSER_DB_PORT: '3308',
        NSCMF_BROWSER_DB_DATABASE: 'nscmf_fe3140_testing',
    });

    assert.equal(runtime.port, 8021);
    assert.equal(runtime.guardProbePort, 8022);
    assert.equal(runtime.baseUrl, 'http://127.0.0.1:8021');
    assert.equal(runtime.serverCheckUrl, 'http://127.0.0.1:8021/up');
    assert.equal(runtime.environment.APP_URL, 'http://127.0.0.1:8021');
    assert.equal(runtime.environment.DB_HOST, '127.0.0.1');
    assert.equal(runtime.environment.DB_PORT, '3308');
    assert.equal(runtime.environment.DB_DATABASE, 'nscmf_fe3140_testing');
});

test('browser runtime refuses an invalid shell-interpolated port before any process starts', () => {
    const script = `import ${JSON.stringify(runtimeUrl)};`;
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, NSCMF_BROWSER_APP_PORT: '8021; unsafe' },
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /NSCMF_BROWSER_APP_PORT/);
});
