import type { BusinessStatus } from '@/features/nscmf/contracts';
import type { RecordSummary } from '@/features/nscmf/types';

/** Server-provided count for one attention queue. Loading and failure are explicit, never shown as 0. */
export interface QueueCount {
    count?: number | null;
    loading?: boolean;
    error?: string | null;
}

export type Queue = 'drafts' | 'revisions' | 'reviews' | 'approvals';

export type DashboardCounts = Partial<Record<Queue, QueueCount>>;
export type DashboardItems = Partial<Record<Queue, RecordSummary[]>>;

/** Activity metrics of the Dashboard analytics (12 §44.1). */
export type ActivityMetric = 'created' | 'first_submitted' | 'approval_decisions';

export interface StatusCount {
    status: BusinessStatus;
    count: number;
}

/** One analytics scope: the actor's own records, or the organization's submitted records. */
export interface ScopeAnalytics<M extends ActivityMetric> {
    totals_28d: Record<M, number>;
    weekly: Array<{ from: string; through: string } & Record<M, number>>;
    active_status_counts: StatusCount[];
}

/** The `analytics` prop of GET /dashboard (12 §44.1). `organization` is absent without permission. */
export interface DashboardAnalytics {
    period: { from: string; through: string; timezone: string };
    mine: ScopeAnalytics<ActivityMetric>;
    organization?: ScopeAnalytics<'first_submitted' | 'approval_decisions'>;
}
