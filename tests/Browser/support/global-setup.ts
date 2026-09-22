import { prepareBrowserRuntime } from './runtime';

/** Resets only the disposable browser database/storage; the command's guard refuses anything else. */
export default function globalSetup(): void {
    prepareBrowserRuntime();
}
