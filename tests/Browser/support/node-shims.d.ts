/**
 * Narrow typings for the few Node.js APIs the Playwright runtime helpers use. The project does not
 * depend on @types/node (a new dependency needs explicit approval), so only these shapes are declared.
 */
declare module 'node:child_process' {
    interface ExecFileSyncOptions {
        cwd?: string;
        env?: Record<string, string | undefined>;
        encoding: 'utf8';
    }

    export interface ChildProcess {
        kill(signal?: string): boolean;
    }

    export function execFileSync(file: string, args: readonly string[], options: ExecFileSyncOptions): string;

    export function spawn(
        command: string,
        args: readonly string[],
        options: { cwd?: string; env?: Record<string, string | undefined>; stdio?: 'ignore' | 'pipe' },
    ): ChildProcess;
}

declare module 'node:fs' {
    export function existsSync(path: string): boolean;
}

declare module 'node:path' {
    const path: {
        resolve(...segments: string[]): string;
        join(...segments: string[]): string;
    };
    export default path;
}

declare const process: { env: Record<string, string | undefined> };

interface ImportMeta {
    readonly dirname: string;
}
