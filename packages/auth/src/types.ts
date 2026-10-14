// packages/auth/src/types.ts
// Mirrors the live app.user_role enum.
export type UserRole = 'agent' | 'team_leader' | 'manager' | 'director' | 'admin' | 'sales'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  tenantId: string
  approvalStatus: ApprovalStatus
  isActive: boolean
}

export interface Session {
  user: AuthUser
  accessToken: string
  expiresAt: number
}

export interface SessionProvider {
  getSession(): Promise<Session | null>
  getUser(): Promise<AuthUser | null>
  signIn(
    email: string,
    password: string
  ): Promise<{ session: Session | null; error: string | null }>
  signOut(): Promise<void>
  refreshSession(): Promise<Session | null>
}
