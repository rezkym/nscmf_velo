import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RequestFeedback, { type RequestFeedbackError } from './RequestFeedback.vue';

describe('RequestFeedback.vue (FE-07)', () => {
    describe('AC1: feedback_distinguishes_error_classes', () => {
        it('handles 409 conflict: prompts refresh, disables overwrite, emits refresh event on button click', async () => {
            const conflictError: RequestFeedbackError = {
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'Record was modified by another transaction',
                context: {
                    latest_record_version: 15,
                    current_business_status: 'PENDING_REVIEW',
                },
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: conflictError,
                },
            });

            // 409 error class must advise reviewing/refreshing the latest version
            expect(wrapper.text()).toContain('A newer version exists');
            expect(wrapper.text()).toContain('Please refresh to load the latest record');

            // Refresh action button should be present
            const refreshBtn = wrapper.find('[data-testid="feedback-refresh-btn"]');
            expect(refreshBtn.exists()).toBe(true);
            expect(refreshBtn.text()).toMatch(/refresh/i);

            // Retry mutation button must NOT be present for 409 conflict
            const retryBtn = wrapper.find('[data-testid="feedback-retry-btn"]');
            expect(retryBtn.exists()).toBe(false);

            // Clicking refresh emits 'refresh'
            await refreshBtn.trigger('click');
            expect(wrapper.emitted('refresh')).toBeTruthy();
            expect(wrapper.emitted('refresh')?.length).toBe(1);
        });

        it('handles 422 validation error: retains user input and displays field-level guidance without wipe', () => {
            const validationError: RequestFeedbackError = {
                status: 422,
                code: 'NSCMF_VALIDATION_FAILED',
                message: 'The given data was invalid.',
                errors: {
                    reason: ['Reason must be at least 5 characters.'],
                    service_id: 'Service ID is required.',
                },
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: validationError,
                },
            });

            expect(wrapper.text()).toContain('Validation Error');
            expect(wrapper.text()).toContain('Reason must be at least 5 characters.');
            expect(wrapper.text()).toContain('Service ID is required.');
            expect(wrapper.text()).toContain('Please review the highlighted fields and correct your input.');

            // Retains input: No auto-wipe or destructive action button
            expect(wrapper.find('[data-testid="feedback-refresh-btn"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="feedback-retry-btn"]').exists()).toBe(false);
        });

        it('handles 503 service unavailable: provides explicit, safe manual retry button', async () => {
            const serviceUnavailableError: RequestFeedbackError = {
                status: 503,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Subsystem temporarily unavailable',
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: serviceUnavailableError,
                },
            });

            expect(wrapper.text()).toContain('Service Temporarily Unavailable');
            expect(wrapper.text()).toContain('The service is temporarily unavailable. You may retry safely.');

            const retryBtn = wrapper.find('[data-testid="feedback-retry-btn"]');
            expect(retryBtn.exists()).toBe(true);
            expect(retryBtn.text()).toMatch(/retry/i);

            await retryBtn.trigger('click');
            expect(wrapper.emitted('retry')).toBeTruthy();
            expect(wrapper.emitted('retry')?.length).toBe(1);
        });
    });

    describe('AC2: feedback_revoked_session_never_claims_saved', () => {
        it('handles 401 session revoked/expired: disables actions, directs to Login, and never claims draft is saved', async () => {
            const expiredError: RequestFeedbackError = {
                status: 401,
                code: 'SESSION_EXPIRED',
                message: 'Unauthenticated or session revoked.',
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: expiredError,
                    saveStatus: 'saved', // Stale parent status that shouldn't be claimed
                },
            });

            const text = wrapper.text();
            // Never claim draft was saved
            expect(text).not.toContain('Saved just now');
            expect(text).not.toContain('Changes saved');

            // Explicit warning and login guidance
            expect(text).toContain('Your session has expired. Please sign in again.');
            expect(text).toContain('Unsaved changes were not persisted.');

            // Login action button
            const loginBtn = wrapper.find('[data-testid="feedback-login-btn"]');
            expect(loginBtn.exists()).toBe(true);
            expect(loginBtn.text()).toMatch(/sign in|login/i);

            await loginBtn.trigger('click');
            expect(wrapper.emitted('login')).toBeTruthy();

            // Mutating retry actions must be completely absent / disabled
            expect(wrapper.find('[data-testid="feedback-retry-btn"]').exists()).toBe(false);
        });

        it('displays correct save statuses (saving, saved, error) only when session is valid', () => {
            const wrapperSaved = mount(RequestFeedback, {
                props: {
                    saveStatus: 'saved',
                },
            });
            expect(wrapperSaved.text()).toContain('Saved just now');

            const wrapperSaving = mount(RequestFeedback, {
                props: {
                    saveStatus: 'saving',
                },
            });
            expect(wrapperSaving.text()).toContain('Saving…');

            const wrapperSaveFailed = mount(RequestFeedback, {
                props: {
                    saveStatus: 'error',
                },
            });
            expect(wrapperSaveFailed.text()).toContain('Save failed — retry');
        });
    });

    describe('AC3: feedback_never_leaks_private_context', () => {
        it('handles 403 Forbidden: renders generic access-denied message without leaking actor/team/record metadata', () => {
            const forbiddenError: RequestFeedbackError = {
                status: 403,
                code: 'FORBIDDEN_ACTION',
                message: 'Actor user_99 from Team NOC-Alpha is not authorized to edit record REQ-2026-9999',
                context: {
                    actor_id: 'user_99',
                    team_name: 'NOC-Alpha',
                    record_exists: true,
                    secret_debug_info: 'stack trace line 42 at AuthorizationGateway.php',
                },
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: forbiddenError,
                },
            });

            const text = wrapper.text();
            // Must show safe generic message
            expect(text).toContain('Access Denied');
            expect(text).toContain('You do not have permission to perform this action.');

            // MUST NOT leak private actor, team, or debug context
            expect(text).not.toContain('user_99');
            expect(text).not.toContain('NOC-Alpha');
            expect(text).not.toContain('REQ-2026-9999');
            expect(text).not.toContain('record_exists');
            expect(text).not.toContain('secret_debug_info');
            expect(text).not.toContain('AuthorizationGateway.php');
        });

        it('handles 404 Not Found: renders generic not-found message without leaking existence or context', () => {
            const notFoundError: RequestFeedbackError = {
                status: 404,
                code: 'RESOURCE_NOT_FOUND',
                message: 'Target change request #987654 exists but is hidden from caller',
                context: {
                    target_id: '987654',
                    internal_table: 'nscmf_change_requests',
                },
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: notFoundError,
                },
            });

            const text = wrapper.text();
            expect(text).toContain('Not Found');
            expect(text).toContain('The requested resource was not found or is unavailable.');

            expect(text).not.toContain('987654');
            expect(text).not.toContain('nscmf_change_requests');
            expect(text).not.toContain('exists but is hidden');
        });
    });

    describe('AC4: feedback_does_not_auto_retry_mutations', () => {
        it('handles 429 Too Many Requests: displays throttle warning, does NOT auto-retry, requires manual action', async () => {
            vi.useFakeTimers();
            const throttledError: RequestFeedbackError = {
                status: 429,
                code: 'TOO_MANY_REQUESTS',
                message: 'Rate limit exceeded. Try again in 60 seconds.',
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: throttledError,
                },
            });

            expect(wrapper.text()).toContain('Too Many Requests');
            expect(wrapper.text()).toContain('Rate limit exceeded. Please wait before retrying.');

            // Fast forward timers to ensure no automatic background retry occurs
            vi.advanceTimersByTime(5000);
            expect(wrapper.emitted('retry')).toBeFalsy();

            // Only explicit user click triggers retry if allowed
            const retryBtn = wrapper.find('[data-testid="feedback-retry-btn"]');
            expect(retryBtn.exists()).toBe(true);

            await retryBtn.trigger('click');
            expect(wrapper.emitted('retry')).toBeTruthy();
            expect(wrapper.emitted('retry')?.length).toBe(1);

            vi.useRealTimers();
        });

        it('handles network offline / rejection: clearly differentiates network error from server rejection and avoids auto-retry', async () => {
            vi.useFakeTimers();
            const networkError: RequestFeedbackError = {
                status: 0,
                isNetworkError: true,
                message: 'Failed to fetch / network offline',
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: networkError,
                },
            });

            expect(wrapper.text()).toContain('Network Connection Issue');
            expect(wrapper.text()).toContain('Unable to reach server. Please check your connection.');

            // Differentiates network error from server validation
            expect(wrapper.text()).not.toContain('Validation Error');

            // No automatic retry timer
            vi.advanceTimersByTime(5000);
            expect(wrapper.emitted('retry')).toBeFalsy();

            // Safe explicit retry button available
            const retryBtn = wrapper.find('[data-testid="feedback-retry-btn"]');
            expect(retryBtn.exists()).toBe(true);

            await retryBtn.trigger('click');
            expect(wrapper.emitted('retry')?.length).toBe(1);

            vi.useRealTimers();
        });

        it('handles generic fallback error when status is unknown or 500', () => {
            const genericError: RequestFeedbackError = {
                status: 500,
                message: 'Server failure',
            };

            const wrapper = mount(RequestFeedback, {
                props: {
                    error: genericError,
                },
            });

            expect(wrapper.text()).toContain('Unexpected Error');
            expect(wrapper.text()).toContain('An unexpected error occurred. Please try again later.');
        });
    });

    it('lists no validation messages when the error carries none, and reports a failed save', () => {
        const withoutErrors = mount(RequestFeedback, {
            props: { error: { status: 422, code: 'VALIDATION_FAILED', message: 'Some fields need attention.' } },
        });
        expect(withoutErrors.findAll('li')).toHaveLength(0);

        const failedSave = mount(RequestFeedback, { props: { saveStatus: 'error' } });
        expect(failedSave.text()).toContain('Save failed');
    });

    it('shows a save indicator only for a status it knows, and skips a message of an unexpected type', () => {
        const noStatus = mount(RequestFeedback, { props: { saveStatus: null } });
        expect(noStatus.text()).not.toContain('Saving');
        expect(noStatus.text()).not.toContain('Saved just now');

        const oddPayload = mount(RequestFeedback, {
            props: {
                error: {
                    status: 422,
                    code: 'VALIDATION_FAILED',
                    message: 'Some fields need attention.',
                    errors: { row_no: 42 as unknown as string, name: 'The name is required.' },
                },
            },
        });
        const messages = oddPayload.findAll('li').map((item) => item.text());
        expect(messages).toEqual(['The name is required.']);
    });
});

describe('the save indicator never contradicts an error (07 §23)', () => {
    it.each([
        [409, 'a version conflict'],
        [422, 'a validation failure'],
        [403, 'a denial'],
        [503, 'an unavailable subsystem'],
    ])('does not claim "Saved just now" alongside %i, %s', (status) => {
        const wrapper = mount(RequestFeedback, {
            props: {
                error: { status },
                saveStatus: 'saved',
            },
        });

        expect(wrapper.text()).not.toContain('Saved just now');
    });

    it('still shows the save indicator when nothing failed', () => {
        const wrapper = mount(RequestFeedback, { props: { error: null, saveStatus: 'saved' } });

        expect(wrapper.text()).toContain('Saved just now');
    });
});

describe('validation is recognised under either catalogue name (gap G07)', () => {
    it.each(['NSCMF_VALIDATION_FAILED', 'VALIDATION_FAILED'])('renders the validation panel for code %s', (code) => {
        const wrapper = mount(RequestFeedback, {
            props: { error: { code, errors: { 'change.results.0.result_summary': 'Required.' } } },
        });

        expect(wrapper.find('[data-testid="feedback-validation"]').exists()).toBe(true);
    });
});

describe('each failure is recognised by status alone as well as by code', () => {
    it.each([
        [{ status: 401 }, 'feedback-session-revoked'],
        [{ code: 'SESSION_EXPIRED' }, 'feedback-session-revoked'],
        [{ status: 0 }, 'feedback-network-error'],
        [{ isNetworkError: true }, 'feedback-network-error'],
    ])('renders %o as %s', (error, testId) => {
        // The server may name the failure, or only give a status; either alone must be enough.
        const wrapper = mount(RequestFeedback, { props: { error } });

        expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
    });
});
