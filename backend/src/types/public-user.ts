export type PublicUser = {
  id: number
  email: string
  passwordHash: string
}

export type PublicUserIdentity = Pick<PublicUser, 'id' | 'email'>

export type AuthenticatedPublicUserSession = {
  id: number
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
  publicUser: PublicUserIdentity
}
