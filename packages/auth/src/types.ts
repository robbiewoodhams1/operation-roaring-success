// packages/auth/src/types.ts
export type UserRole = 'agent' | 'team_leader' | 'manager' | 'director' | 'admin'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  tenantId: string
  approvalStatus: ApprovalStatus
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
