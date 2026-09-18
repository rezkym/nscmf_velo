<script setup lang="ts">
import { AlertTriangle, Check, Copy, KeyRound, ShieldAlert } from '@lucide/vue';
import { onBeforeUnmount, ref, watch } from 'vue';

export interface OneTimeCredentialProps {
    open?: boolean;
    temporaryPassword?: string | null;
    username?: string | null;
}

const props = withDefaults(defineProps<OneTimeCredentialProps>(), {
    open: false,
    temporaryPassword: null,
    username: null,
});

const emit = defineEmits<{
    (e: 'dismiss'): void;
}>();

// Module-scope consumed registry: survives component unmount and remount (HARD GATE 2 / N-13-2).
// Keyed by non-reversible hash tokens so raw plaintext credentials are never retained in memory (N-13-4).
const moduleConsumedTokens: Set<string> = (globalThis as unknown as Record<string, Set<string>>).__alyaOneTimeConsumedTokens ??= new Set<string>();

// Transient state: strictly kept in memory during active reveal, cleared on close/dismiss/unmount.
const internalCredential = ref<string | null>(null);
const copySuccess = ref(false);
const copyError = ref<string | null>(null);

// Identity tracking: instance-level exposed set pointing to module registry for inspection/asserts.
const revealedCredentialKey = ref<string | null>(null);
const consumedCredentialKeys = ref<Set<string>>(moduleConsumedTokens);
defineExpose({ consumedCredentialKeys, internalCredential });

/**
 * Deterministic, non-reversible token hashing to prevent raw credential retention in memory (N-13-4).
 * Uses a double-mixed 64-bit non-cryptographic hash (fast, browser-safe, pure synchronous TS, zero dependencies).
 */
function hashToken(raw: string): string {
    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c64e6d ^ 0;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

function makeCredentialKey(password: string | null | undefined, username: string | null | undefined): string {
    if (!password) return '';
    const userPart = username || '';
    const hashedPw = hashToken(password);
    return userPart ? `${userPart}:::hash:${hashedPw}` : `hash:${hashedPw}`;
}

function makePasswordOnlyKey(password: string | null | undefined): string {
    if (!password) return '';
    return `hash:${hashToken(password)}`;
}

function purgeTransientState(): void {
    internalCredential.value = null;
    copySuccess.value = false;
    copyError.value = null;
}

// Watch dialog open state, password, and username.
// Evaluates on open transitions and prop payload changes.
watch(
    () => [props.open, props.temporaryPassword, props.username] as const,
    ([isOpen, newPassword, newUsername], oldVal) => {
        // Reset copy feedback on every state transition (F-13-2)
        copySuccess.value = false;
        copyError.value = null;

        if (isOpen) {
            if (!newPassword) {
                internalCredential.value = null;
                return;
            }

            const currentKey = makeCredentialKey(newPassword, newUsername);
            const passwordOnlyKey = makePasswordOnlyKey(newPassword);

            // If this credential identity (or raw password) has already been consumed, fail closed:
            // do not re-render plaintext (F-13-1, AC1 verbatim, N-13-1, N-13-2).
            if (
                moduleConsumedTokens.has(currentKey) ||
                moduleConsumedTokens.has(passwordOnlyKey)
            ) {
                internalCredential.value = null;
                return;
            }

            // Fresh unrevealed credential: arm the identity and reveal
            revealedCredentialKey.value = currentKey;
            internalCredential.value = newPassword;
        } else {
            // Dialog closed via open prop: mark the current revealed credential consumed (F-13-1, F-13-3, F-13-6)
            if (revealedCredentialKey.value) {
                moduleConsumedTokens.add(revealedCredentialKey.value);
            }
            const [, oldPassword, oldUsername] = oldVal || [false, null, null];
            const activePassword = internalCredential.value || oldPassword;
            const activeUsername = oldUsername || newUsername;
            if (activePassword) {
                // Key both the active username and the password-only hash so it cannot be re-rendered
                // even if reopened under a different username (N-13-1)!
                moduleConsumedTokens.add(makeCredentialKey(activePassword, activeUsername));
                if (newUsername) {
                    moduleConsumedTokens.add(makeCredentialKey(activePassword, newUsername));
                }
                moduleConsumedTokens.add(makePasswordOnlyKey(activePassword));
            }
            purgeTransientState();
            revealedCredentialKey.value = null;
        }
    },
    { immediate: true },
);

async function copyCredential(): Promise<void> {
    if (!internalCredential.value) return;

    try {
        await navigator.clipboard.writeText(internalCredential.value);
        copySuccess.value = true;
        copyError.value = null;
    } catch {
        copyError.value = 'Gagal menyalin ke clipboard. Silakan salin manual secara aman.';
        copySuccess.value = false;
    }
}

function handleDismiss(): void {
    if (revealedCredentialKey.value) {
        moduleConsumedTokens.add(revealedCredentialKey.value);
    }
    if (props.temporaryPassword) {
        // HARD GATE 1 / N-13-1: consume BOTH username-keyed and username-agnostic password token
        moduleConsumedTokens.add(makeCredentialKey(props.temporaryPassword, props.username));
        moduleConsumedTokens.add(makePasswordOnlyKey(props.temporaryPassword));
    }
    revealedCredentialKey.value = null;
    purgeTransientState();
    emit('dismiss');
}

onBeforeUnmount(() => {
    // Purge memory immediately on unmount (F-13-4, N-13-2)
    // Mark the revealed credential as consumed in the module registry so recreating/remounting
    // the component while parent holds stale props will fail closed.
    if (revealedCredentialKey.value) {
        moduleConsumedTokens.add(revealedCredentialKey.value);
    }
    if (props.temporaryPassword) {
        moduleConsumedTokens.add(makeCredentialKey(props.temporaryPassword, props.username));
        moduleConsumedTokens.add(makePasswordOnlyKey(props.temporaryPassword));
    }
    purgeTransientState();
    revealedCredentialKey.value = null;
});
</script>

<template>
    <div
        v-if="open"
        data-testid="one-time-credential-container"
        class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-dialog-title"
    >
        <div class="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <!-- Header -->
            <div class="flex items-start gap-3">
                <div class="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <KeyRound class="w-5 h-5" />
                </div>
                <div>
                    <h3 id="credential-dialog-title" class="text-lg font-semibold text-foreground">
                        Kredensial Sementara (Satu Kali Tayang)
                    </h3>
                    <p class="text-xs text-muted-foreground mt-0.5">
                        Pengguna: <span class="font-medium text-foreground">{{ username || 'User' }}</span>
                    </p>
                </div>
            </div>

            <!-- Active Transient Credential View -->
            <div v-if="internalCredential" class="space-y-4">
                <div class="p-3.5 bg-muted/60 border border-border rounded-lg space-y-2">
                    <span class="text-xs font-medium text-muted-foreground block">Password Sementara:</span>
                    <div class="flex items-center justify-between gap-2">
                        <code
                            data-testid="temporary-password-display"
                            class="px-2.5 py-1.5 bg-background border border-border rounded font-mono text-sm font-semibold tracking-wider text-foreground select-all break-all"
                        >
                            {{ internalCredential }}
                        </code>
                        <button
                            type="button"
                            data-testid="btn-copy-credential"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                            @click="copyCredential"
                        >
                            <Check v-if="copySuccess" class="w-3.5 h-3.5 text-emerald-600" />
                            <Copy v-else class="w-3.5 h-3.5" />
                            <span>{{ copySuccess ? 'Tersalin' : 'Salin' }}</span>
                        </button>
                    </div>
                </div>

                <!-- Feedback area -->
                <div
                    v-if="copyError"
                    data-testid="clipboard-feedback"
                    class="text-xs text-destructive bg-destructive/10 p-2.5 rounded border border-destructive/20"
                >
                    {{ copyError }}
                </div>
                <div
                    v-else-if="copySuccess"
                    data-testid="clipboard-feedback"
                    class="text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20"
                >
                    Password sementara berhasil disalin ke clipboard.
                </div>

                <!-- Warning Notice: Authority contract -->
                <div class="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    <div class="flex items-center gap-2 font-semibold">
                        <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Pemberitahuan Keamanan Penting</span>
                    </div>
                    <ul class="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>
                            Password sementara ini <strong>hanya ditampilkan tepat satu kali</strong> dan tidak dapat diambil atau ditampilkan kembali setelah dialog ini ditutup.
                        </li>
                        <li>
                            Salurkan kredensial ini kepada pengguna terkait melalui <strong>kanal komunikasi internal yang aman</strong>.
                        </li>
                        <li>
                            Pengguna wajib mengganti password sementara ini saat pertama kali login sebelum dapat mengakses aplikasi normal.
                        </li>
                        <li>
                            Kredensial ini tidak disimpan dalam log, audit trail, maupun detail profil pengguna.
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Lost Credential Advisory (AC4) -->
            <div
                v-else
                data-testid="credential-lost-advisory"
                class="p-4 bg-muted/60 border border-border rounded-lg space-y-3"
            >
                <div class="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <ShieldAlert class="w-4 h-4 text-destructive shrink-0" />
                    <span>Kredensial Tidak Tersedia</span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                    Sesuai kebijakan keamanan, password sementara tidak disimpan dan tidak dapat ditampilkan ulang.
                    Jika kredensial hilang atau belum tersalurkan, <strong>Lakukan reset password baru</strong> yang memerlukan re-autentikasi kata sandi administrator Anda.
                </p>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end pt-2">
                <button
                    type="button"
                    data-testid="btn-dismiss-credential"
                    class="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    @click="handleDismiss"
                >
                    Tutup & Hapus Tampilan
                </button>
            </div>
        </div>
    </div>
</template>
