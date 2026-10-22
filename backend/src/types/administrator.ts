export type Administrator = {
  id: number
  email: string
  passwordHash: string
}

export type AdministratorIdentity = Pick<Administrator, 'id' | 'email'>

export type AuthenticatedAdministratorSession = {
  id: number
  tokenHash: string
  csrfTokenHash: string
  expiresAt: Date
  administrator: AdministratorIdentity
}
