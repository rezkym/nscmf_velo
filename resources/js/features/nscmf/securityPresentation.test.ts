import { describe, expect, it } from 'vitest';

/*
 * FE-56 static regression guard over every production frontend source. It complements the
 * behavioural tests beside each component; it never replaces server-side security.
 */
const sources = import.meta.glob<string>(['/resources/js/**/*.{vue,ts}', '!/resources/js/**/*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
});

function offenders(pattern: RegExp, except: string[] = []): string[] {
    return Object.entries(sources)
        .filter(([file, source]) => !except.includes(file) && pattern.test(source))
        .map(([file]) => file);
}

describe('Frontend security presentation (FE-56)', () => {
    it('reads the production sources', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(50);
        expect(Object.keys(sources)).toContain('/resources/js/app.ts');
    });

    it('AC2: never renders untrusted text as HTML', () => {
        expect(offenders(/v-html|\.innerHTML\s*=|insertAdjacentHTML/)).toEqual([]);
    });

    it('AC3: never keeps credentials or private context in browser storage or logs', () => {
        expect(offenders(/(localStorage|sessionStorage|indexedDB)\s*\./)).toEqual([]);
        expect(offenders(/console\.(log|debug|info)\(/)).toEqual([]);
    });

    it('AC4: production code never imports the test doubles or fixtures', () => {
        expect(offenders(/from ['"]@\/testing|['"][^'"]*fixtures?['"]/, ['/resources/js/testing/inertia.ts'])).toEqual(
            [],
        );
    });

    it('AC1: never spreads a whole server record into a request body', () => {
        expect(offenders(/(sendJson|router\.(post|put|patch))\([^)]*\.\.\.props\.record/)).toEqual([]);
    });
});
