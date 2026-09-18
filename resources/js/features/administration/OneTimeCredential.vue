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

// Transient state: strictly kept in memory, never persisted or remembered
const internalCredential = ref<string | null>(null);
const copySuccess = ref(false);
const copyError = ref<string | null>(null);

// Authoritative revealed-credential identity tracking for this instance.
// Keyed to the credential payload and associated username. Once a payload has been revealed
// or dismissed, or when the dialog closes, this identity is marked consumed.
// A subsequent reveal is allowed ONLY if the credential payload changes to a new, unrevealed value.
const revealedCredentialKey = ref<string | null>(null);
const consumedCredentialKeys = ref<Set<string>>(new Set());

function makeCredentialKey(password: string | null | undefined, username: string | null | undefined): string {
    return `${username || ''}:::${password || ''}`;
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
            const passwordOnlyKey = makeCredentialKey(newPassword, null);

            // If this credential identity (or raw password) has already been consumed, fail closed:
            // do not re-render plaintext (F-13-1, AC1 verbatim).
            if (
                consumedCredentialKeys.value.has(currentKey) ||
                consumedCredentialKeys.value.has(passwordOnlyKey) ||
                (revealedCredentialKey.value !== null && revealedCredentialKey.value !== currentKey)
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
                consumedCredentialKeys.value.add(revealedCredentialKey.value);
            }
            const [, oldPassword, oldUsername] = oldVal || [false, null, null];
            const activePassword = internalCredential.value || oldPassword || newPassword;
            const activeUsername = oldUsername || newUsername;
            if (activePassword) {
                // Key both the active username and the raw password so it cannot be re-rendered
                // even if reopened under a different username!
                consumedCredentialKeys.value.add(makeCredentialKey(activePassword, activeUsername));
                consumedCredentialKeys.value.add(makeCredentialKey(activePassword, newUsername));
                consumedCredentialKeys.value.add(makeCredentialKey(activePassword, null));
            }
            // Once closed, any credential that was previously delivered to this instance is consumed
            if (newPassword) {
                consumedCredentialKeys.value.add(makeCredentialKey(newPassword, null));
            }
            purgeTransientState();
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
        consumedCredentialKeys.value.add(revealedCredentialKey.value);
        revealedCredentialKey.value = null;
    }
    if (props.temporaryPassword) {
        consumedCredentialKeys.value.add(makeCredentialKey(props.temporaryPassword, props.username));
    }
    purgeTransientState();
    emit('dismiss');
}

onBeforeUnmount(() => {
    // Purge memory immediately on unmount (F-13-4)
    purgeTransientState();
    revealedCredentialKey.value = null;
    consumedCredentialKeys.value.clear();
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
