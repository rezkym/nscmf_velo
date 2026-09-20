export interface AuthUser {
    id: number;
    username: string;
    name: string;
    team_id?: number | null;
    team?: { id: number; name: string } | null;
    must_change_password?: boolean;
}

/** Shared Inertia props (12 §100). Permissions are the only authorization input the UI reads. */
export interface SharedAuthProps {
    auth?: {
        user?: AuthUser | null;
        permissions?: string[];
    };
    [key: string]: unknown;
}
