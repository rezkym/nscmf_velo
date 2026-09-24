export interface AuthUser {
    id: number;
    username: string;
    name: string;
    team_id?: number | null;
    team?: { id: number; name: string } | null;
    must_change_password?: boolean;
    /** The user's own protected-identity marker (07 §51); never an authorization grant. */
    is_protected_superadmin?: boolean;
}

/** Shared Inertia props (12 §100). Permissions are the only authorization input the UI reads. */
export interface SharedAuthProps {
    auth?: {
        user?: AuthUser | null;
        permissions?: string[];
    };
    [key: string]: unknown;
}
