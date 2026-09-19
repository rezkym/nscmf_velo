<script setup lang="ts">
import { AlertTriangle, Check, Copy, KeyRound, ShieldAlert } from '@lucide/vue';
import { ref, watch } from 'vue';

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
const dismissed = ref(false);

// When modal opens with a temporary password, store it transiently
watch(
    () => [props.open, props.temporaryPassword] as const,
    ([isOpen, newPassword], oldVal) => {
        const [, oldPassword] = oldVal || [false, null];
        if (isOpen) {
            // If it was already dismissed and the password prop hasn't changed to a new string, keep it purged
            if (dismissed.value && newPassword === oldPassword) {
                internalCredential.value = null;
                return;
            }
            if (newPassword) {
                internalCredential.value = newPassword;
                dismissed.value = false;
                copySuccess.value = false;
                copyError.value = null;
            } else {
                internalCredential.value = null;
            }
        } else {
            // Instantly clear memory when modal closes
            internalCredential.value = null;
            copySuccess.value = false;
            copyError.value = null;
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
    // Purge memory immediately on dismiss
    internalCredential.value = null;
    dismissed.value = true;
    copySuccess.value = false;
    copyError.value = null;
    emit('dismiss');
}
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
                <div
                    class="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2 text-xs text-amber-900 dark:text-amber-200"
                >
                    <div class="flex items-center gap-2 font-semibold">
                        <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Pemberitahuan Keamanan Penting</span>
                    </div>
                    <ul class="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>
                            Password sementara ini <strong>hanya ditampilkan tepat satu kali</strong> dan tidak dapat
                            diambil atau ditampilkan kembali setelah dialog ini ditutup.
                        </li>
                        <li>
                            Salurkan kredensial ini kepada pengguna terkait melalui
                            <strong>kanal komunikasi internal yang aman</strong>.
                        </li>
                        <li>
                            Pengguna wajib mengganti password sementara ini saat pertama kali login sebelum dapat
                            mengakses aplikasi normal.
                        </li>
                        <li>Kredensial ini tidak disimpan dalam log, audit trail, maupun detail profil pengguna.</li>
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
                    Sesuai kebijakan keamanan, password sementara tidak disimpan dan tidak dapat ditampilkan ulang. Jika
                    kredensial hilang atau belum tersalurkan, <strong>Lakukan reset password baru</strong> yang
                    memerlukan re-autentikasi kata sandi administrator Anda.
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
